// netlify/functions/join-room.js
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

if (!getApps().length) {
    initializeApp({
        credential: credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CONFIG_JSON))
    });
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
        if (roomData.bannedUsers && roomData.bannedUsers.includes(userId)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'You are banned from this room.' })
            };
        }
        if (roomData.isLocked && (!roomData.whitelistedUsers || !roomData.whitelistedUsers.includes(userId))) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'This room is locked and you are not whitelisted.' })
            };
        }
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
