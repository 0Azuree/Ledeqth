// chat.js
document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const usernameScreen = document.getElementById('username-screen');
    const usernameInput = document.getElementById('usernameInput');
    const setUsernameButton = document.getElementById('setUsernameButton');
    const usernameError = document.getElementById('usernameError');

    const roomSelectionScreen = document.getElementById('room-selection-screen');
    const createRoomButton = document.getElementById('createRoomButton');
    const joinRoomButton = document.getElementById('joinRoomButton');

    const joinRoomInputScreen = document.getElementById('join-room-input-screen');
    const roomCodeInput = document.getElementById('roomCodeInput');
    const submitJoinRoomButton = document.getElementById('submitJoinRoomButton');
    const roomJoinError = document.getElementById('roomJoinError');
    const backToRoomSelectionButton = document.getElementById('backToRoomSelection');

    const chatRoomScreen = document.getElementById('chat-room-screen');
    const roomTitle = document.getElementById('roomTitle');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const leaveRoomButton = document.getElementById('leaveRoomButton');

    let username = '';
    let currentRoomCode = '';
    let pusher = null;
    let channel = null; // The Pusher channel for the current room

    // --- Configuration (These are now directly set using your keys) ---
    const PUSHER_APP_KEY = 'cc987e99c9392dc90a23'; // Your Pusher Key
    const PUSHER_APP_CLUSTER = 'us2'; // Your Pusher Cluster

    // --- Screen Management Functions ---
    function showScreen(screen) {
        usernameScreen.style.display = 'none';
        roomSelectionScreen.style.display = 'none';
        joinRoomInputScreen.style.display = 'none';
        chatRoomScreen.style.display = 'none';
        screen.style.display = 'flex'; // Use flex for centering/layout
    }

    function showUsernameScreen() {
        showScreen(usernameScreen);
        usernameError.style.display = 'none';
        usernameInput.value = '';
        usernameInput.focus();
    }

    function showRoomSelectionScreen() {
        if (!username) { // Prevent direct access without username
            showUsernameScreen();
            return;
        }
        showScreen(roomSelectionScreen);
    }

    function showJoinRoomInputScreen() {
        showScreen(joinRoomInputScreen);
        roomJoinError.style.display = 'none';
        roomCodeInput.value = '';
        roomCodeInput.focus();
    }

    function showChatRoomScreen(code) {
        currentRoomCode = code;
        roomTitle.textContent = `Room: ${code}`;
        messagesDiv.innerHTML = ''; // Clear previous messages
        showScreen(chatRoomScreen);
        messageInput.focus();
    }

    // --- Message Display Function ---
    function addMessageToChat(sender, message, timestamp) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');

        if (sender === 'SERVER') {
            messageElement.innerHTML = `<span class="server-message">${message}</span>`;
        } else {
            messageElement.innerHTML = `<span class="username">${sender}:</span> ${message} <span class="timestamp">${timestamp || new Date().toLocaleTimeString()}</span>`;
        }
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to bottom
    }

    // --- Room Code Generation ---
    function generateRoomCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < 5; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    // --- Pusher Connection and Channel Management ---
    function connectToPusher() {
        if (pusher) return; // Already connected

        pusher = new Pusher(PUSHER_APP_KEY, {
            cluster: PUSHER_APP_CLUSTER,
            forceTLS: true // Ensure secure connection
        });

        pusher.connection.bind('connected', () => {
            console.log('Connected to Pusher!');
            // After connecting, proceed to username screen or room selection
            if (username) {
                showRoomSelectionScreen();
            } else {
                showUsernameScreen();
            }
        });

        pusher.connection.bind('disconnected', () => {
            console.warn('Disconnected from Pusher.');
            // Handle disconnection, e.g., show a message or try to reconnect
            alert('Disconnected from chat. Please refresh to reconnect.');
            showUsernameScreen(); // Go back to start
        });

        pusher.connection.bind('error', (err) => {
            console.error('Pusher connection error:', err);
            alert('Pusher connection error. Check console for details.');
            showUsernameScreen(); // Go back to start
        });
    }

    function subscribeToRoom(roomCode) {
        if (channel) {
            pusher.unsubscribe(channel.name); // Unsubscribe from previous channel
        }

        channel = pusher.subscribe(`chat-${roomCode}`); // Prefix channels to avoid conflicts

        channel.bind('pusher:subscription_succeeded', () => {
            console.log(`Subscribed to channel: chat-${roomCode}`);
            addMessageToChat('SERVER', `You joined room: ${roomCode}`);
            showChatRoomScreen(roomCode);
        });

        channel.bind('pusher:subscription_error', (status) => {
            console.error(`Subscription error for chat-${roomCode}:`, status);
            roomJoinError.textContent = `Failed to join room. Status: ${status}`;
            roomJoinError.style.display = 'block';
            showRoomSelectionScreen(); // Go back if subscription fails
        });

        // Bind to our custom 'message' event on this channel
        channel.bind('message', (data) => {
            addMessageToChat(data.username, data.message, data.timestamp);
        });
    }

    function leavePusherRoom() {
        if (channel) {
            pusher.unsubscribe(channel.name);
            channel = null;
            console.log(`Left channel: ${currentRoomCode}`);
            addMessageToChat('SERVER', `You left room: ${currentRoomCode}`);
            currentRoomCode = '';
        }
        showRoomSelectionScreen();
    }


    // --- Event Listeners ---

    setUsernameButton.addEventListener('click', () => {
        const inputName = usernameInput.value.trim();
        if (inputName.length >= 3 && inputName.length <= 12) {
            username = inputName;
            connectToPusher(); // Connect to Pusher once username is set
        } else {
            usernameError.textContent = 'Username must be 3-12 characters long.';
            usernameError.style.display = 'block';
        }
    });

    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setUsernameButton.click();
        }
    });

    createRoomButton.addEventListener('click', () => {
        const newRoomCode = generateRoomCode();
        subscribeToRoom(newRoomCode);
    });

    joinRoomButton.addEventListener('click', () => {
        showJoinRoomInputScreen();
    });

    backToRoomSelectionButton.addEventListener('click', () => {
        showRoomSelectionScreen();
    });

    submitJoinRoomButton.addEventListener('click', () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (code.length === 5) {
            subscribeToRoom(code);
        } else {
            roomJoinError.textContent = 'Room code must be 5 letters.';
            roomJoinError.style.display = 'block';
        }
    });

    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitJoinRoomButton.click();
        }
    });

    sendMessageButton.addEventListener('click', async () => {
        const message = messageInput.value.trim();
        if (message && currentRoomCode && username) {
            // Send message via Netlify Function (HTTP POST)
            try {
                const response = await fetch('/.netlify/functions/chat-event', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        roomCode: currentRoomCode,
                        username: username,
                        message: message,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Failed to send message:', errorData.message);
                    alert('Error sending message: ' + errorData.message); // Simple alert for user feedback
                } else {
                    messageInput.value = ''; // Clear input on success
                }
            } catch (error) {
                console.error('Network error sending message:', error);
                alert('Network error. Could not send message.');
            }
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessageButton.click();
        }
    });

    leaveRoomButton.addEventListener('click', () => {
        leavePusherRoom();
    });

    // Initial screen setup (connect Pusher only after username is set, or if coming back to username screen)
    showUsernameScreen();
});
