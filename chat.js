// chat.js

document.addEventListener('DOMContentLoaded', async () => {
    // Firebase and Firestore global variables are now initialized in chat.html script tag
    const firebaseApp = window.firebaseApp;
    const db = window.db;
    const auth = window.auth;
    const initialAuthToken = window.initialAuthToken;
    const appId = window.appId;

    // Firebase Firestore functions (now globally exposed from chat.html)
    // No longer destructuring from 'firebase.firestore' or 'firebase.auth'
    const doc = window.doc;
    const getDoc = window.getDoc;
    const setDoc = window.setDoc;
    const updateDoc = window.updateDoc;
    const onSnapshot = window.onSnapshot;
    const collection = window.collection;
    const query = window.query;
    const where = window.where;
    const arrayUnion = window.arrayUnion;
    const arrayRemove = window.arrayRemove;

    // Firebase Auth functions (now globally exposed from chat.html)
    const signInAnonymously = window.signInAnonymously;
    const signInWithCustomToken = window.signInWithCustomToken;
    const onAuthStateChanged = window.onAuthStateChanged;


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

    const chatRoomContainer = document.getElementById('chat-room-container'); // New container for chat + info
    const chatRoomScreen = document.getElementById('chat-room-screen');
    const roomTitle = document.getElementById('roomTitle');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const leaveRoomButton = document.getElementById('leaveRoomButton');

    // Room Info Panel Elements
    const roomInfoPanel = document.getElementById('room-info-panel');
    const roomOwnerUsername = document.getElementById('roomOwnerUsername');
    const roomMembersList = document.getElementById('roomMembersList');
    const ownerCommandsSection = document.getElementById('owner-commands-section'); // Section to show/hide owner commands

    // Pusher setup
    let pusher;
    let channel;
    let currentRoomCode = null;
    let currentRoomRef = null; // Firestore document reference for the current room
    let roomSnapshotUnsubscribe = null; // To unsubscribe from Firestore listener

    // User data
    let currentUserData = {
        userId: null,
        username: null
    };
    let currentRoomData = { // Store current room's state
        ownerId: null,
        members: [],
        bannedUsers: [],
        whitelistedUsers: [],
        isLocked: false
    };

    // --- Firebase Authentication Setup ---
    // The Firebase app and auth are initialized in chat.html script tag.
    // We wait for auth state to be ready before proceeding.
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserData.userId = user.uid;
            console.log("Firebase user ID:", currentUserData.userId);
            // Check if username is already set in localStorage
            const storedUsername = localStorage.getItem('chatUsername');
            if (storedUsername) {
                currentUserData.username = storedUsername;
                showScreen('roomSelection');
            } else {
                showScreen('username');
            }
        } else {
            // This case should ideally not happen if signInAnonymously/signInWithCustomToken works
            console.error("User not authenticated after onAuthStateChanged.");
            showScreen('username'); // Fallback to username screen
        }
    });


    // --- Screen Management ---
    function showScreen(screenName) {
        usernameScreen.style.display = 'none';
        roomSelectionScreen.style.display = 'none';
        joinRoomInputScreen.style.display = 'none';
        chatRoomContainer.style.display = 'none'; // Hide the container for chat + info

        if (screenName === 'username') {
            usernameScreen.style.display = 'flex';
            usernameInput.focus();
        } else if (screenName === 'roomSelection') {
            roomSelectionScreen.style.display = 'flex';
        } else if (screenName === 'joinRoomInput') {
            joinRoomInputScreen.style.display = 'flex';
            roomCodeInput.focus();
        } else if (screenName === 'chatRoom') {
            chatRoomContainer.style.display = 'flex'; // Show the container
            messageInput.focus();
        }
    }

    // --- Username Handling ---
    setUsernameButton.addEventListener('click', () => {
        console.log("Set Username button clicked!"); // DEBUG LOG
        const username = usernameInput.value.trim();
        console.log("Entered username:", username); // DEBUG LOG

        if (username.length >= 3 && username.length <= 12) {
            currentUserData.username = username;
            localStorage.setItem('chatUsername', username);
            usernameError.style.display = 'none';
            console.log("Username valid, showing room selection."); // DEBUG LOG
            showScreen('roomSelection');
        } else {
            usernameError.textContent = 'Username must be 3-12 characters long.';
            usernameError.style.display = 'block';
            console.log("Username invalid:", usernameError.textContent); // DEBUG LOG
        }
    });

    // --- Room Selection ---
    createRoomButton.addEventListener('click', async () => {
        if (!currentUserData.userId || !currentUserData.username) {
            usernameError.textContent = 'Please set your username first.';
            usernameError.style.display = 'block';
            showScreen('username');
            return;
        }
        await createChatRoom();
    });

    joinRoomButton.addEventListener('click', () => {
        if (!currentUserData.userId || !currentUserData.username) {
            usernameError.textContent = 'Please set your username first.';
            usernameError.style.display = 'block';
            showScreen('username');
            return;
        }
        showScreen('joinRoomInput');
    });

    backToRoomSelectionButton.addEventListener('click', () => {
        roomCodeInput.value = '';
        roomJoinError.style.display = 'none';
        showScreen('roomSelection');
    });

    submitJoinRoomButton.addEventListener('click', async () => {
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        if (roomCode.length === 5) {
            await joinChatRoom(roomCode);
        } else {
            roomJoinError.textContent = 'Room code must be 5 letters.';
            roomJoinError.style.display = 'block';
        }
    });

    // --- Firebase/Firestore Room Management ---
    async function createChatRoom() {
        const roomCode = generateRoomCode();
        // Use Netlify Function for room creation to ensure server-side Firestore interaction
        try {
            const response = await fetch('/.netlify/functions/create-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomCode: roomCode,
                    username: currentUserData.username,
                    userId: currentUserData.userId,
                    appId: appId
                })
            });

            const result = await response.json();
            if (response.ok) {
                console.log(`Room ${roomCode} created by ${currentUserData.username}`);
                await connectToPusher(roomCode);
                currentRoomCode = roomCode;
                currentRoomRef = doc(db, `artifacts/${appId}/public/data/chatRooms`, roomCode); // Get doc ref
                setupRoomDataListener(currentRoomRef); // Start listening for room data changes
                showScreen('chatRoom');
                roomTitle.textContent = `Room: ${roomCode}`;
                addMessage('server', `You created room ${roomCode}. Share this code with others!`);
            } else {
                alert(`Failed to create room: ${result.message}`); // Use custom modal later
                console.error("Error creating room via Netlify Function:", result.message);
                if (result.message === 'Room code already exists. Try again.') {
                     return createChatRoom(); // Recursively try again for collision
                }
            }
        } catch (error) {
            console.error("Error creating room (network/function call):", error);
            alert("Failed to create room due to a network error. Please try again."); // Use custom modal later
        }
    }

    async function joinChatRoom(roomCode) {
        // Use Netlify Function for room joining to ensure server-side Firestore interaction
        try {
            const response = await fetch('/.netlify/functions/join-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomCode: roomCode,
                    username: currentUserData.username,
                    userId: currentUserData.userId,
                    appId: appId
                })
            });

            const result = await response.json();
            if (response.ok) {
                console.log(`Joined room ${roomCode}`);
                await connectToPusher(roomCode);
                currentRoomCode = roomCode;
                currentRoomRef = doc(db, `artifacts/${appId}/public/data/chatRooms`, roomCode); // Get doc ref
                setupRoomDataListener(currentRoomRef); // Start listening for room data changes
                showScreen('chatRoom');
                roomTitle.textContent = `Room: ${roomCode}`;
                addMessage('server', `You joined room ${roomCode}.`);

                // Load initial messages from roomData passed by function
                messagesDiv.innerHTML = ''; // Clear previous messages
                if (result.roomData && result.roomData.messages && result.roomData.messages.length > 0) {
                    result.roomData.messages.forEach(msg => {
                        addMessage(msg.sender, msg.text, msg.timestamp);
                    });
                }
            } else {
                roomJoinError.textContent = result.message || 'Failed to join room. Unknown error.';
                roomJoinError.style.display = 'block';
                console.error("Error joining room via Netlify Function:", result.message);
            }
        } catch (error) {
            console.error("Error joining room (network/function call):", error);
            roomJoinError.textContent = 'Failed to join room due to a network error. Please try again.';
            roomJoinError.style.display = 'block';
        }
    }

    async function leaveChatRoom() {
        if (!currentRoomCode || !currentUserData.userId || !currentRoomRef) return;

        try {
            // No direct Firestore update for leaving from client-side now, as join-room handles addition.
            // When a user leaves, the `onSnapshot` listener for the room will update member list for others.
            // We just need to clean up client-side state.

            // Unsubscribe from Pusher channel
            if (channel) {
                pusher.unsubscribe(`private-${currentRoomCode}`);
                channel = null;
            }
            // Unsubscribe from Firestore listener
            if (roomSnapshotUnsubscribe) {
                roomSnapshotUnsubscribe();
                roomSnapshotUnsubscribe = null;
            }

            currentRoomCode = null;
            currentRoomRef = null;
            currentRoomData = { ownerId: null, members: [], bannedUsers: [], whitelistedUsers: [], isLocked: false }; // Reset local room data
            messagesDiv.innerHTML = ''; // Clear messages
            roomOwnerUsername.textContent = 'Loading...'; // Reset room info panel
            roomMembersList.innerHTML = '<li>Loading...</li>';
            ownerCommandsSection.style.display = 'none'; // Hide owner commands

            showScreen('roomSelection');
            console.log("Left room.");
        } catch (error) {
            console.error("Error leaving room:", error);
            alert("Failed to leave room. Please try again.");
        }
    }

    // --- Firestore Real-time Room Data Listener ---
    function setupRoomDataListener(roomDocRef) {
        if (roomSnapshotUnsubscribe) {
            roomSnapshotUnsubscribe(); // Unsubscribe from any previous listener
        }

        onSnapshot(roomDocRef, (docSnapshot) => { // Use direct onSnapshot
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                currentRoomData = data; // Update local room data
                updateRoomInfoPanel();
            } else {
                // Room no longer exists (e.g., deleted by owner)
                addMessage('server', 'The room you were in no longer exists. You have been disconnected.');
                leaveChatRoom(); // Force leave
            }
        }, (error) => {
            console.error("Error listening to room data:", error);
            addMessage('server', 'Error updating room info. You may have been disconnected.');
            leaveChatRoom(); // Force leave on error
        });
    }

    function updateRoomInfoPanel() {
        roomOwnerUsername.textContent = 'Unknown';
        roomMembersList.innerHTML = '';
        ownerCommandsSection.style.display = 'none'; // Hide by default

        if (currentRoomData.ownerId) {
            const ownerMember = currentRoomData.members.find(m => m.userId === currentRoomData.ownerId);
            if (ownerMember) {
                roomOwnerUsername.textContent = ownerMember.username;
            } else {
                 // If owner is not in members list (e.g., they left but still own it)
                 roomOwnerUsername.textContent = `${currentRoomData.ownerId} (User ID)`; // Fallback
            }
        }

        if (currentRoomData.members && currentRoomData.members.length > 0) {
            currentRoomData.members.forEach(member => {
                const li = document.createElement('li');
                li.textContent = member.username;
                if (member.userId === currentRoomData.ownerId) {
                    li.classList.add('owner');
                }
                roomMembersList.appendChild(li);
            });
        } else {
            roomMembersList.innerHTML = '<li>No members</li>';
        }


        // Show owner commands if current user is the owner
        if (currentUserData.userId === currentRoomData.ownerId) {
            ownerCommandsSection.style.display = 'block';
        }
    }


    // --- Pusher Integration ---
    async function connectToPusher(roomCode) {
        // Fetch Pusher config from Netlify Function
        const pusherConfigResponse = await fetch('/.netlify/functions/pusher-config'); // Assuming this exists
        const pusherConfig = await pusherConfigResponse.json();

        if (!pusherConfig.key || !pusherConfig.cluster) {
            console.error("Pusher config not loaded:", pusherConfig);
            alert("Failed to load chat configuration. Please try again.");
            return;
        }

        Pusher.logToConsole = true; // For debugging Pusher

        pusher = new Pusher(pusherConfig.key, {
            cluster: pusherConfig.cluster,
            authEndpoint: '/.netlify/functions/pusher-auth',
            auth: {
                headers: {
                    'x-user-id': currentUserData.userId,
                    'x-username': currentUserData.username
                }
            }
        });

        channel = pusher.subscribe(`private-${roomCode}`);

        channel.bind('pusher:subscription_succeeded', () => {
            console.log('Pusher subscription to channel succeeded.');
        });

        channel.bind('client-message', (data) => {
            addMessage(data.sender, data.message, data.timestamp);
        });

        channel.bind('client-admin-message', (data) => {
            addMessage('server', data.message);
            // If the message is about being kicked/banned, force leave
            if (data.action === 'kick' && data.targetUserId === currentUserData.userId) {
                addMessage('server', 'You have been kicked from the room.');
                leaveChatRoom();
            } else if (data.action === 'ban' && data.targetUserId === currentUserData.userId) {
                addMessage('server', 'You have been banned from the room.');
                leaveChatRoom();
            } else if (data.action === 'kickall' && currentUserData.userId !== currentRoomData.ownerId) {
                addMessage('server', 'All members (except owner) have been kicked.');
                leaveChatRoom();
            } else if (data.action === 'banall' && currentUserData.userId !== currentRoomData.ownerId) {
                addMessage('server', 'All members (except owner) have been banned.');
                leaveChatRoom();
            }
        });

        channel.bind('pusher:subscription_error', (status) => {
            console.error('Pusher subscription error:', status);
            addMessage('server', `Chat connection error: ${status}. Please try again.`);
            leaveChatRoom(); // Force leave on subscription error
        });
    }

    // --- Message Handling ---
    function addMessage(sender, message, timestamp = Date.now()) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');

        const date = new Date(timestamp);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (sender === 'server') {
            messageElement.innerHTML = `<span class="server-message">${message}</span> <span class="timestamp">(${timeString})</span>`;
        } else {
            messageElement.innerHTML = `<span class="username">${sender}:</span> ${message} <span class="timestamp">(${timeString})</span>`;
        }
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to bottom
    }

    sendMessageButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || !channel) return;

        if (message.startsWith('!')) {
            await handleOwnerCommand(message);
        } else {
            // Send regular message via Pusher
            channel.trigger('client-message', {
                sender: currentUserData.username,
                message: message,
                timestamp: Date.now()
            });
        }
        messageInput.value = '';
    }

    async function handleOwnerCommand(commandText) {
        if (currentUserData.userId !== currentRoomData.ownerId) {
            addMessage('server', 'You are not the room owner to use commands.', 'red');
            return;
        }

        const parts = commandText.split(/\s+/); // Split by one or more spaces
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        try {
            const response = await fetch('/.netlify/functions/chat-admin-handler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserData.userId,
                    username: currentUserData.username,
                    roomCode: currentRoomCode,
                    command: command,
                    args: args
                })
            });

            const result = await response.json();
            if (response.ok) {
                addMessage('server', `Command executed: ${result.message}`, 'lime');
            } else {
                addMessage('server', `Command error: ${result.message}`, 'red');
            }
        } catch (error) {
            console.error("Error sending command to Netlify Function:", error);
            addMessage('server', `Failed to send command: ${error.message}`, 'red');
        }
    }

    // --- Utility Functions ---
    function generateRoomCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    leaveRoomButton.addEventListener('click', leaveChatRoom);
});
