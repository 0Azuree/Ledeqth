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

    // Firebase Firestore functions (globally exposed from chat.html)
    // IMPORTANT: No longer trying to destructure from a global 'firebase' object.
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

    // Firebase Auth functions (globally exposed from chat.html)
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

    let isAuthReady = false; // New state variable to track Firebase Auth readiness

    // --- Firebase Authentication Listener ---
    // This listener is crucial. It updates `isAuthReady` and `currentUserData.userId`
    // once Firebase authentication has completed (anonymous sign-in or custom token).
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserData.userId = user.uid;
            isAuthReady = true;
            setUsernameButton.disabled = false; // Enable the "Done" button once auth is ready
            usernameError.style.display = 'none'; // Hide any previous error message
            console.log("Firebase Auth Ready. User ID:", currentUserData.userId);

            // If a username is already stored locally AND we are still on the username screen,
            // automatically transition to the room selection screen.
            const storedUsername = localStorage.getItem('chatUsername');
            if (storedUsername && usernameScreen.style.display === 'flex') {
                currentUserData.username = storedUsername;
                showScreen('roomSelection');
            }
        } else {
            // Firebase Auth is not ready (e.g., initial state or error during sign-in)
            isAuthReady = false;
            setUsernameButton.disabled = true; // Disable the button until auth is ready
            usernameError.textContent = 'Authenticating with Firebase... Please wait.';
            usernameError.style.display = 'block';
            console.log("Firebase Auth Not Ready. User is null.");
        }
    });

    // --- Initial Screen Display ---
    // Show the username screen immediately when the DOM content is loaded.
    // The "Done" button will be disabled by default until `onAuthStateChanged` confirms Firebase Auth is ready.
    showScreen('username');
    setUsernameButton.disabled = true; // Initially disable the button
    usernameError.textContent = 'Loading authentication...'; // Show a loading message
    usernameError.style.display = 'block';


    // --- Screen Management ---
    // Function to control which main chat screen is visible.
    function showScreen(screenName) {
        // Hide all main chat screens first
        usernameScreen.style.display = 'none';
        roomSelectionScreen.style.display = 'none';
        joinRoomInputScreen.style.display = 'none';
        chatRoomContainer.style.display = 'none'; // This container holds chat + info panel

        // Show the requested screen and set focus where appropriate
        if (screenName === 'username') {
            usernameScreen.style.display = 'flex';
            usernameInput.focus();
        } else if (screenName === 'roomSelection') {
            roomSelectionScreen.style.display = 'flex';
        } else if (screenName === 'joinRoomInput') {
            joinRoomInputScreen.style.display = 'flex';
            roomCodeInput.focus();
        } else if (screenName === 'chatRoom') {
            chatRoomContainer.style.display = 'flex'; // Show the chat room and info panel
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll messages to bottom
            messageInput.focus();
        }
    }

    // --- Username Handling ---
    setUsernameButton.addEventListener('click', () => {
        console.log("Set Username button clicked!");
        const username = usernameInput.value.trim();
        console.log("Entered username:", username);

        // Before processing username, ensure Firebase authentication is fully ready.
        if (!isAuthReady || !currentUserData.userId) {
            usernameError.textContent = 'Firebase authentication not ready. Please wait a moment and try again.';
            usernameError.style.display = 'block';
            console.warn("Attempted to set username before Firebase Auth was ready.");
            return; // Stop function execution if not ready
        }

        // Validate username length
        if (username.length >= 3 && username.length <= 12) {
            currentUserData.username = username; // Store valid username
            localStorage.setItem('chatUsername', username); // Persist username locally
            usernameError.style.display = 'none'; // Clear any error message
            console.log("Username valid and Auth ready, showing room selection.");
            showScreen('roomSelection'); // Move to the next screen
        } else {
            // Show error if username is invalid
            usernameError.textContent = 'Username must be 3-12 characters long.';
            usernameError.style.display = 'block';
            console.log("Username invalid:", usernameError.textContent);
        }
    });

    // --- Room Selection Screen Event Listeners ---
    createRoomButton.addEventListener('click', async () => {
        // Ensure auth and username are ready before creating a room
        if (!isAuthReady || !currentUserData.userId || !currentUserData.username) {
            usernameError.textContent = 'Authentication or username not set. Please wait or re-enter username.';
            usernameError.style.display = 'block';
            showScreen('username');
            return;
        }
        await createChatRoom(); // Call function to create a chat room
    });

    joinRoomButton.addEventListener('click', () => {
        // Ensure auth and username are ready before attempting to join
        if (!isAuthReady || !currentUserData.userId || !currentUserData.username) {
            usernameError.textContent = 'Authentication or username not set. Please wait or re-enter username.';
            usernameError.style.display = 'block';
            showScreen('username');
            return;
        }
        showScreen('joinRoomInput'); // Transition to join room input screen
    });

    // --- Join Room Input Screen Event Listeners ---
    backToRoomSelectionButton.addEventListener('click', () => {
        roomCodeInput.value = ''; // Clear input
        roomJoinError.style.display = 'none'; // Hide error
        showScreen('roomSelection'); // Go back to room selection
    });

    submitJoinRoomButton.addEventListener('click', async () => {
        const roomCode = roomCodeInput.value.trim().toUpperCase(); // Get and format room code
        if (roomCode.length === 5) {
            await joinChatRoom(roomCode); // Call function to join a chat room
        } else {
            // Show error if room code is invalid
            roomJoinError.textContent = 'Room code must be 5 letters.';
            roomJoinError.style.display = 'block';
        }
    });

    // --- Firebase/Firestore Room Management Functions (Interacting with Netlify Functions) ---
    async function createChatRoom() {
        const roomCode = generateRoomCode(); // Generate a unique 5-letter code
        try {
            // Call Netlify Function to create room server-side (for Firestore interaction)
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

            const result = await response.json(); // Parse response from Netlify Function
            if (response.ok) {
                console.log(`Room ${roomCode} created by ${currentUserData.username}`);
                await connectToPusher(roomCode); // Connect to Pusher for real-time messaging
                currentRoomCode = roomCode;
                // Get Firestore document reference for the newly created room
                currentRoomRef = doc(db, `artifacts/${appId}/public/data/chatRooms`, roomCode);
                setupRoomDataListener(currentRoomRef); // Start real-time listener for room data changes
                showScreen('chatRoom'); // Transition to the chat room screen
                roomTitle.textContent = `Room: ${roomCode}`; // Update room title
                addMessage('server', `You created room ${roomCode}. Share this code with others!`);
            } else {
                console.error(`Failed to create room: ${result.message}`);
                roomJoinError.textContent = `Failed to create room: ${result.message}`;
                roomJoinError.style.display = 'block';
                // If room code collision, try creating another one
                if (result.message === 'Room code already exists. Try again.') {
                     return createChatRoom();
                }
            }
        } catch (error) {
            console.error("Error creating room (network/function call):", error);
            roomJoinError.textContent = `Failed to create room due to a network error: ${error.message}. Please try again.`;
            roomJoinError.style.display = 'block';
        }
    }

    async function joinChatRoom(roomCode) {
        try {
            // Call Netlify Function to join room server-side (for Firestore interaction)
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
                await connectToPusher(roomCode); // Connect to Pusher for real-time messaging
                currentRoomCode = roomCode;
                // Get Firestore document reference for the joined room
                currentRoomRef = doc(db, `artifacts/${appId}/public/data/chatRooms`, roomCode);
                setupRoomDataListener(currentRoomRef); // Start real-time listener for room data changes
                showScreen('chatRoom'); // Transition to chat room screen
                roomTitle.textContent = `Room: ${roomCode}`; // Update room title
                addMessage('server', `You joined room ${roomCode}.`);

                // Display initial messages loaded from room data
                messagesDiv.innerHTML = ''; // Clear any existing messages
                if (result.roomData && result.roomData.messages && result.roomData.messages.length > 0) {
                    result.roomData.messages.forEach(msg => {
                        addMessage(msg.sender, msg.text, msg.timestamp);
                    });
                }
            } else {
                // Show error message if joining failed
                roomJoinError.textContent = result.message || 'Failed to join room. Unknown error.';
                roomJoinError.style.display = 'block';
                console.error("Error joining room via Netlify Function:", result.message);
            }
        } catch (error) {
            console.error("Error joining room (network/function call):", error);
            roomJoinError.textContent = `Failed to join room due to a network error: ${error.message}. Please try again.`;
            roomJoinError.style.display = 'block';
        }
    }

    // Function to handle a user leaving the chat room
    async function leaveChatRoom() {
        if (!currentRoomCode || !currentUserData.userId || !currentRoomRef) return;

        try {
            // Unsubscribe from the Pusher channel
            if (channel) {
                pusher.unsubscribe(`private-${currentRoomCode}`);
                channel = null;
            }
            // Unsubscribe from the Firestore real-time listener
            if (roomSnapshotUnsubscribe) {
                roomSnapshotUnsubscribe();
                roomSnapshotUnsubscribe = null;
            }

            // Reset local room state variables
            currentRoomCode = null;
            currentRoomRef = null;
            currentRoomData = { ownerId: null, members: [], bannedUsers: [], whitelistedUsers: [], isLocked: false };
            messagesDiv.innerHTML = ''; // Clear chat messages
            roomOwnerUsername.textContent = 'Loading...'; // Reset room info panel
            roomMembersList.innerHTML = '<li>Loading...</li>';
            ownerCommandsSection.style.display = 'none'; // Hide owner commands section

            showScreen('roomSelection'); // Go back to room selection screen
            console.log("Left room.");
        } catch (error) {
            console.error("Error leaving room:", error);
        }
    }

    // --- Firestore Real-time Room Data Listener ---
    // Sets up a real-time listener on the current room's Firestore document.
    function setupRoomDataListener(roomDocRef) {
        // Unsubscribe from any previously active listener to avoid memory leaks
        if (roomSnapshotUnsubscribe) {
            roomSnapshotUnsubscribe();
        }

        roomSnapshotUnsubscribe = onSnapshot(roomDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                currentRoomData = data; // Update local state with latest room data
                updateRoomInfoPanel(); // Update the UI based on new data
            } else {
                // If the document no longer exists (e.g., room deleted by owner)
                addMessage('server', 'The room you were in no longer exists. You have been disconnected.');
                leaveChatRoom(); // Force the user to leave the room
            }
        }, (error) => {
            // Handle errors during real-time listening
            console.error("Error listening to room data:", error);
            addMessage('server', 'Error updating room info. You may have been disconnected.');
            leaveChatRoom(); // Force leave on error
        });
    }

    // Updates the "Room Info" panel in the UI
    function updateRoomInfoPanel() {
        roomOwnerUsername.textContent = 'Unknown'; // Default owner text
        roomMembersList.innerHTML = ''; // Clear current member list
        ownerCommandsSection.style.display = 'none'; // Hide owner commands by default

        // Display room owner's username
        if (currentRoomData.ownerId) {
            const ownerMember = currentRoomData.members.find(m => m.userId === currentRoomData.ownerId);
            if (ownerMember) {
                roomOwnerUsername.textContent = ownerMember.username;
            } else {
                 // Fallback: If owner is not in members list (e.g., they left but still own it, or a bug)
                 roomOwnerUsername.textContent = `${currentRoomData.ownerId} (User ID)`;
            }
        }

        // Populate the members list
        if (currentRoomData.members && currentRoomData.members.length > 0) {
            currentRoomData.members.forEach(member => {
                const li = document.createElement('li');
                li.textContent = member.username;
                if (member.userId === currentRoomData.ownerId) {
                    li.classList.add('owner'); // Highlight owner in the list
                }
                roomMembersList.appendChild(li);
            });
        } else {
            roomMembersList.innerHTML = '<li>No members</li>'; // Display message if no members
        }

        // Show owner commands section ONLY if the current user is the room owner
        if (currentUserData.userId === currentRoomData.ownerId) {
            ownerCommandsSection.style.display = 'block';
        }
    }

    // --- Pusher Integration ---
    async function connectToPusher(roomCode) {
        // Fetch Pusher configuration from a Netlify Function securely
        const pusherConfigResponse = await fetch('/.netlify/functions/pusher-config');
        const pusherConfig = await pusherConfigResponse.json();

        if (!pusherConfig.key || !pusherConfig.cluster) {
            console.error("Pusher config not loaded:", pusherConfig);
            // Use console.error instead of alert to avoid blocking UI
            // alert("Failed to load chat configuration. Please try again.");
            return;
        }

        Pusher.logToConsole = true; // Enable Pusher debugging logs in console

        // Initialize Pusher client
        pusher = new Pusher(pusherConfig.key, {
            cluster: pusherConfig.cluster,
            authEndpoint: '/.netlify/functions/pusher-auth', // Authentication endpoint for private channels
            auth: {
                headers: {
                    'x-user-id': currentUserData.userId, // Pass user ID in headers for auth
                    'x-username': currentUserData.username // Pass username in headers for auth
                }
            }
        });

        channel = pusher.subscribe(`private-${roomCode}`); // Subscribe to the private room channel

        // Event listener for successful Pusher subscription
        channel.bind('pusher:subscription_succeeded', () => {
            console.log('Pusher subscription to channel succeeded.');
        });

        // Event listener for incoming chat messages (client-message event)
        channel.bind('client-message', (data) => {
            addMessage(data.sender, data.message, data.timestamp);
        });

        // Event listener for admin messages (e.g., kicks, bans)
        channel.bind('client-admin-message', (data) => {
            addMessage('server', data.message); // Display the admin message
            // Handle specific actions that require the user to leave the room
            if (data.action === 'kick' && data.targetUserId === currentUserData.userId) {
                addMessage('server', 'You have been kicked from the room.');
                leaveChatRoom();
            } else if (data.action === 'ban' && data.targetUserId === currentUserData.userId) {
                addMessage('server', 'You have been banned from the room.');
                leaveChatRoom();
            } else if (data.action === 'kickall' && currentUserData.userId !== currentRoomData.ownerId) {
                // If current user is not the owner and a kickall command was sent
                addMessage('server', 'All members (except owner) have been kicked.');
                leaveChatRoom();
            } else if (data.action === 'banall' && currentUserData.userId !== currentRoomData.ownerId) {
                // If current user is not the owner and a banall command was sent
                addMessage('server', 'All members (except owner) have been banned.');
                leaveChatRoom();
            }
        });

        // Event listener for Pusher subscription errors
        channel.bind('pusher:subscription_error', (status) => {
            console.error('Pusher subscription error:', status);
            addMessage('server', `Chat connection error: ${status}. Please try again.`);
            leaveChatRoom(); // Force leave on connection error
        });
    }

    // --- Message Handling (Displaying Messages in UI) ---
    function addMessage(sender, message, timestamp = Date.now()) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');

        const date = new Date(timestamp);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (sender === 'server') {
            // Special styling for server messages
            messageElement.innerHTML = `<span class="server-message">${message}</span> <span class="timestamp">(${timeString})</span>`;
        } else {
            // Standard message format with username and timestamp
            messageElement.innerHTML = `<span class="username">${sender}:</span> ${message} <span class="timestamp">(${timeString})</span>`;
        }
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to the latest message
    }

    // --- Sending Messages and Commands ---
    sendMessageButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for new line
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || !channel) return; // Don't send empty messages or if not connected

        if (message.startsWith('!')) {
            // If message starts with '!', treat it as an owner command
            await handleOwnerCommand(message);
        } else {
            // Otherwise, trigger a regular chat message event via Pusher
            channel.trigger('client-message', {
                sender: currentUserData.username,
                message: message,
                timestamp: Date.now()
            });
        }
        messageInput.value = ''; // Clear the input field after sending
    }

    // Handles owner commands by sending them to a Netlify Function
    async function handleOwnerCommand(commandText) {
        // First, client-side check if the user is the room owner
        if (currentUserData.userId !== currentRoomData.ownerId) {
            addMessage('server', 'You are not the room owner to use commands.', 'red');
            return;
        }

        const parts = commandText.split(/\s+/); // Split command by spaces
        const command = parts[0].toLowerCase(); // Get the command (e.g., "!kick")
        const args = parts.slice(1); // Get command arguments

        try {
            // Send the command details to the server-side Netlify Function for processing
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

            const result = await response.json(); // Parse the response from the server
            if (response.ok) {
                addMessage('server', `Command executed: ${result.message}`, 'lime'); // Show success message
            } else {
                addMessage('server', `Command error: ${result.message}`, 'red'); // Show error message
            }
        } catch (error) {
            console.error("Error sending command to Netlify Function:", error);
            addMessage('server', `Failed to send command: ${error.message}`, 'red');
        }
    }

    // --- Utility Functions ---
    // Generates a random 5-letter uppercase room code
    function generateRoomCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    // Event listener for the "Leave Room" button
    leaveRoomButton.addEventListener('click', leaveChatRoom);
});
