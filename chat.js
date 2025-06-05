// chat.js - This script relies on Firebase and Pusher variables and functions
// being exposed globally by the script type="module" in chat.html.

document.addEventListener('DOMContentLoaded', async () => {
    // Access Firebase variables and functions directly from the window object.
    // These are initialized and exposed in chat.html's <script type="module"> block.
    const firebaseApp = window.firebaseApp;
    const db = window.db;
    const auth = window.auth;
    const initialAuthToken = window.initialAuthToken; // Canvas-injected token
    const appId = window.appId; // Canvas-injected app ID

    // Firebase Firestore functions
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

    // Firebase Auth functions
    const signInAnonymously = window.signInAnonymously; // Exposed for direct use if needed
    const signInWithCustomToken = window.signInWithCustomToken; // Exposed for direct use if needed
    const onAuthStateChanged = window.onAuthStateChanged; // The main listener is set in chat.html

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

    const chatRoomContainer = document.getElementById('chat-room-container');
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
    const ownerCommandsSection = document.getElementById('owner-commands-section');

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

    // --- Initial Authentication Status Check and UI Display ---
    // This runs once DOM is loaded. The `onAuthStateChanged` in chat.html will ensure auth is ready.
    // We wait for `auth.currentUser` to be populated, which `onAuthStateChanged` in chat.html guarantees.
    // If it's not immediately available, the onAuthStateChanged in chat.html will eventually update it.
    // Using a small delay to ensure auth is processed if it's async and not immediately ready.
    const checkAuthStateAndShowScreen = () => {
        if (auth.currentUser) {
            currentUserData.userId = auth.currentUser.uid;
            console.log("chat.js: Current User ID after DOMContentLoaded:", currentUserData.userId);
            const storedUsername = localStorage.getItem('chatUsername');
            if (storedUsername) {
                currentUserData.username = storedUsername;
                console.log("chat.js: Found stored username, showing room selection.");
                showScreen('roomSelection');
            } else {
                console.log("chat.js: No stored username, showing username screen.");
                showScreen('username');
            }
        } else {
            console.log("chat.js: No auth.currentUser found yet. Waiting for onAuthStateChanged.");
            // Fallback: If auth.currentUser is not immediately available, show username screen
            // The onAuthStateChanged in chat.html will eventually call back and trigger the proper screen.
            showScreen('username');
        }
    };

    // Call this after a short delay to allow Firebase Auth to initialize properly
    setTimeout(checkAuthStateAndShowScreen, 100);


    // --- Screen Management ---
    function showScreen(screenName) {
        usernameScreen.style.display = 'none';
        roomSelectionScreen.style.display = 'none';
        joinRoomInputScreen.style.display = 'none';
        chatRoomContainer.style.display = 'none';

        if (screenName === 'username') {
            usernameScreen.style.display = 'flex';
            usernameInput.focus();
        } else if (screenName === 'roomSelection') {
            roomSelectionScreen.style.display = 'flex';
        } else if (screenName === 'joinRoomInput') {
            joinRoomInputScreen.style.display = 'flex';
            roomCodeInput.focus();
        } else if (screenName === 'chatRoom') {
            chatRoomContainer.style.display = 'flex';
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Ensure scroll on display
            messageInput.focus();
        }
    }

    // --- Username Handling ---
    setUsernameButton.addEventListener('click', () => {
        console.log("Set Username button clicked!"); // DEBUG LOG
        const username = usernameInput.value.trim();
        console.log("Entered username:", username); // DEBUG LOG

        if (username.length >= 3 && username.length <= 12) {
            if (!auth.currentUser || !auth.currentUser.uid) {
                usernameError.textContent = 'Firebase authentication not ready. Please wait a moment and try again.';
                usernameError.style.display = 'block';
                console.warn("Attempted to set username before Firebase Auth was ready.");
                return;
            }
            currentUserData.username = username;
            localStorage.setItem('chatUsername', username);
            usernameError.style.display = 'none';
            console.log("Username valid and Auth ready, showing room selection."); // DEBUG LOG
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
                currentRoomRef = doc(db, `artifacts/${appId}/public/data/chatRooms`, roomCode);
                setupRoomDataListener(currentRoomRef);
                showScreen('chatRoom');
                roomTitle.textContent = `Room: ${roomCode}`;
                addMessage('server', `You created room ${roomCode}. Share this code with others!`);
            } else {
                alert(`Failed to create room: ${result.message}`);
                console.error("Error creating room via Netlify Function:", result.message);
                if (result.message === 'Room code already exists. Try again.') {
                     return createChatRoom();
                }
            }
        } catch (error) {
            console.error("Error creating room (network/function call):", error);
            alert("Failed to create room due to a network error. Please try again.");
        }
    }

    async function joinChatRoom(roomCode) {
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
                currentRoomRef = doc(db, `artifacts/${appId}/public/data/chatRooms`, roomCode);
                setupRoomDataListener(currentRoomRef);
                showScreen('chatRoom');
                roomTitle.textContent = `Room: ${roomCode}`;
                addMessage('server', `You joined room ${roomCode}.`);

                messagesDiv.innerHTML = '';
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
            if (channel) {
                pusher.unsubscribe(`private-${currentRoomCode}`);
                channel = null;
            }
            if (roomSnapshotUnsubscribe) {
                roomSnapshotUnsubscribe();
                roomSnapshotUnsubscribe = null;
            }

            currentRoomCode = null;
            currentRoomRef = null;
            currentRoomData = { ownerId: null, members: [], bannedUsers: [], whitelistedUsers: [], isLocked: false };
            messagesDiv.innerHTML = '';
            roomOwnerUsername.textContent = 'Loading...';
            roomMembersList.innerHTML = '<li>Loading...</li>';
            ownerCommandsSection.style.display = 'none';

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
            roomSnapshotUnsubscribe();
        }

        roomSnapshotUnsubscribe = onSnapshot(roomDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                currentRoomData = data;
                updateRoomInfoPanel();
            } else {
                addMessage('server', 'The room you were in no longer exists. You have been disconnected.');
                leaveChatRoom();
            }
        }, (error) => {
            console.error("Error listening to room data:", error);
            addMessage('server', 'Error updating room info. You may have been disconnected.');
            leaveChatRoom();
        });
    }

    function updateRoomInfoPanel() {
        roomOwnerUsername.textContent = 'Unknown';
        roomMembersList.innerHTML = '';
        ownerCommandsSection.style.display = 'none';

        if (currentRoomData.ownerId) {
            const ownerMember = currentRoomData.members.find(m => m.userId === currentRoomData.ownerId);
            if (ownerMember) {
                roomOwnerUsername.textContent = ownerMember.username;
            } else {
                 roomOwnerUsername.textContent = `${currentRoomData.ownerId} (User ID)`;
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

        if (currentUserData.userId === currentRoomData.ownerId) {
            ownerCommandsSection.style.display = 'block';
        }
    }

    // --- Pusher Integration ---
    async function connectToPusher(roomCode) {
        const pusherConfigResponse = await fetch('/.netlify/functions/pusher-config');
        const pusherConfig = await pusherConfigResponse.json();

        if (!pusherConfig.key || !pusherConfig.cluster) {
            console.error("Pusher config not loaded:", pusherConfig);
            alert("Failed to load chat configuration. Please try again.");
            return;
        }

        Pusher.logToConsole = true;

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
            leaveChatRoom();
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
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
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

        const parts = commandText.split(/\s+/);
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
