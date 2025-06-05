// netlify/functions/create-room.js
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin'); // Import credential

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) { // Check if any app is already initialized by Firebase Admin
    // Initialize from environment variable
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

    // Define the Firestore path for public data
    const roomRef = db.collection(`artifacts/${appId}/public/data/chatRooms`).doc(roomCode);

    try {
        const roomDoc = await roomRef.get();
        if (roomDoc.exists) {
            return {
                statusCode: 409, // Conflict
                body: JSON.stringify({ message: 'Room code already exists. Try again.' })
            };
        }

        await roomRef.set({
            ownerId: userId, // Set the creator as the owner
            roomCode: roomCode,
            createdAt: Date.now(),
            members: [{ userId: userId, username: username }], // Add creator as first member
            bannedUsers: [],
            whitelistedUsers: [],
            isLocked: false,
            messages: [] // Initialize empty messages array
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
