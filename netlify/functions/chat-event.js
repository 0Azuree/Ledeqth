// netlify/functions/chat-event.js
const Pusher = require('pusher');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  const { roomCode, username, message } = JSON.parse(event.body);

  if (!roomCode || !username || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing roomCode, username, or message' })
    };
  }

  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER,
    useTLS: true,
  });

  try {
    // Trigger a 'message' event on the specific room's channel
    // We are using a prefixed channel name 'chat-' to categorize chat rooms.
    await pusher.trigger(`chat-${roomCode}`, 'message', {
      username: username,
      message: message,
      timestamp: new Date().toLocaleTimeString(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message sent successfully!' })
    };
  } catch (error) {
    console.error('Pusher error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to send message via Pusher.' })
    };
  }
};
