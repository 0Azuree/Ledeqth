// netlify/functions/leave-room-handler.js
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');
const Pusher = require('pusher');

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
    initializeApp({
        credential: credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CONFIG_JSON))
    });
}

const db = getFirestore();

// Initialize Pusher (ensure these are set as Netlify Environment Variables)
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER,
    useTLS: true
});

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { roomCode, userId, username, appId } = JSON.parse(event.body);

        if (!roomCode || !userId || !username || !appId) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Missing required parameters.' }) };
        }

        const roomRef = db.collection(`artifacts/${appId}/public/data/chatRooms`).doc(roomCode);

        // Use a transaction to ensure atomicity for complex updates/deletes
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);

            if (!roomDoc.exists) {
                // Room already deleted, nothing to do
                return { statusCode: 200, body: JSON.stringify({ message: 'Room already closed/deleted.' }) };
            }

            const roomData = roomDoc.data();
            const currentMembers = roomData.members || [];

            // Find the leaving member's data
            const leavingMember = currentMembers.find(m => m.userId === userId);
            if (!leavingMember) {
                return { statusCode: 404, body: JSON.stringify({ message: 'User not found in room members.' }) };
            }

            // Remove the leaving member
            const updatedMembers = currentMembers.filter(m => m.userId !== userId);

            let newOwnerId = roomData.ownerId;
            let newOwnerUsername = null;
            let ownerTransferred = false;

            // Check if the leaving user was the owner
            if (roomData.ownerId === userId) {
                if (updatedMembers.length > 0) {
                    // Sort remaining members by joinTime to find the next oldest member
                    updatedMembers.sort((a, b) => a.joinTime - b.joinTime);
                    newOwnerId = updatedMembers[0].userId;
                    newOwnerUsername = updatedMembers[0].username;
                    ownerTransferred = true;
                    console.log(`Room ${roomCode}: Ownership transferred to ${newOwnerUsername} (${newOwnerId})`);
                } else {
                    // No members left, room will be deleted
                    newOwnerId = null; // No owner if room is empty
                    console.log(`Room ${roomCode}: No members left, preparing for deletion.`);
                }
            }

            // Update the room document
            if (updatedMembers.length === 0) {
                // If no members left, delete the room
                transaction.delete(roomRef);
                console.log(`Room ${roomCode} deleted due to no remaining members.`);
                await pusher.trigger(`private-${roomCode}`, 'client-admin-message', {
                    action: 'room_closed',
                    message: `The room has been closed because all members have left.`,
                    roomCode: roomCode
                });
            } else {
                // Update members and owner if room is not empty
                transaction.update(roomRef, {
                    members: updatedMembers,
                    ownerId: newOwnerId // Update owner ID (might be same or new)
                });
                console.log(`Room ${roomCode} updated. ${leavingMember.username} left. Members remaining: ${updatedMembers.length}`);

                // Notify all remaining members about the leaving user
                await pusher.trigger(`private-${roomCode}`, 'client-admin-message', {
                    action: 'member_left',
                    message: `${leavingMember.username} has left the room.`,
                    leftUserId: userId
                });

                // If ownership was transferred, notify the new owner and other members
                if (ownerTransferred) {
                    await pusher.trigger(`private-${roomCode}`, 'client-admin-message', {
                        action: 'owner_transferred',
                        message: `Ownership has been transferred to ${newOwnerUsername}.`,
                        newOwnerId: newOwnerId,
                        newOwnerUsername: newOwnerUsername
                    });
                }
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Successfully left room (or room closed).' })
        };

    } catch (error) {
        console.error('Error handling leave room:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Failed to leave room: ${error.message}` })
        };
    }
};
