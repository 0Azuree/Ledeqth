// netlify/functions/pusher-config.js
// This function provides Pusher client configuration to the frontend securely.

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Ensure Pusher environment variables are set in Netlify
    if (!process.env.PUSHER_APP_KEY || !process.env.PUSHER_APP_CLUSTER) {
        console.error("Missing Pusher environment variables for pusher-config.js");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Server configuration error: Pusher credentials missing." })
        };
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // Adjust for specific origins in production
        },
        body: JSON.stringify({
            key: process.env.PUSHER_APP_KEY,
            cluster: process.env.PUSHER_APP_CLUSTER
        })
    };
};
