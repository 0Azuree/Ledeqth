// netlify/functions/join-room.js
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore'); // Import FieldValue

// Initialize Firebase Admin SDK if not already initialized
if (!initializeApp.length) {
    initializeApp();
}

const db = getFirestore();

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { roomCode, username, userId, appId } = JSON.parse(event.body);

    if (!roomCode || !username || !userId || !appId) {
        return { statusCode: 400, body: 'Missing roomCode, username, userId, or appId' };
    }

    const roomRef = db.collection(`artifacts/${appId}/public/data/chatRooms`).doc(roomCode);

    try {
        const roomDoc = await roomRef.get();
        if (!roomDoc.exists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Room does not exist.' })
            };
        }

        const roomData = roomDoc.data();

        // Check if user is banned
        if (roomData.bannedUsers && roomData.bannedUsers.includes(userId)) {
            return {
                statusCode: 403, // Forbidden
                body: JSON.stringify({ message: 'You are banned from this room.' })
            };
        }

        // Check if room is locked and user is not whitelisted
        if (roomData.isLocked && (!roomData.whitelistedUsers || !roomData.whitelistedUsers.includes(userId))) {
            return {
                statusCode: 403, // Forbidden
                body: JSON.stringify({ message: 'This room is locked and you are not whitelisted.' })
            };
        }

        // Add user to members array if not already present
        const isMember = roomData.members.some(m => m.userId === userId);
        if (!isMember) {
            await roomRef.update({
                members: FieldValue.arrayUnion({ userId: userId, username: username })
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Successfully joined room', roomData: roomData })
        };
    } catch (error) {
        console.error('Error joining room:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to join room', error: error.message })
        };
    }
};
