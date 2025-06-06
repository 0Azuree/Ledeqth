// netlify/functions/create-room.js
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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
        if (roomDoc.exists) {
            return {
                statusCode: 409,
                body: JSON.stringify({ message: 'Room code already exists. Try again.' })
            };
        }
        await roomRef.set({
            ownerId: userId,
            roomCode: roomCode,
            createdAt: Date.now(),
            // ADDED: joinTime for the first member
            members: [{ userId: userId, username: username, joinTime: Date.now() }],
            bannedUsers: [],
            whitelistedUsers: [],
            isLocked: false,
            messages: []
        });
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Room created successfully', roomCode: roomCode })
        };
    } catch (error) {
        console.error('Error creating room:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create room', error: error.message })
        };
    }
};
