// netlify/functions/pusher-auth.js
const Pusher = require('pusher');

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

    const socketId = event.body.split('&')[0].split('=')[1];
    const channelName = event.body.split('&')[1].split('=')[1];

    // Extract userId and username from custom headers
    const userId = event.headers['x-user-id'];
    const username = event.headers['x-username'];

    if (!userId || !username) {
        return { statusCode: 401, body: 'Unauthorized: Missing user ID or username headers' };
    }

    try {
        // Authorize private channels
        const authResponse = pusher.authorizeChannel(socketId, channelName, {
            user_id: userId,
            user_info: {
                username: username
            }
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authResponse)
        };
    } catch (error) {
        console.error('Pusher authentication error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to authenticate Pusher channel', error: error.message })
        };
    }
};
