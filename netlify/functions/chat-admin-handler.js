// netlify/functions/chat-admin-handler.js
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');
const Pusher = require('pusher');

if (!getApps().length) {
    initializeApp({
        credential: credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CONFIG_JSON))
    });
}
const db = getFirestore();

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
    try {
        const { userId, username, roomCode, command, args } = JSON.parse(event.body);
        const appId = process.env.__APP_ID || 'default-app-id';

        if (!userId || !username || !roomCode || !command || !appId) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Missing required parameters.' }) };
        }

        const roomRef = db.collection(`artifacts/${appId}/public/data/chatRooms`).doc(roomCode);
        const roomDoc = await roomRef.get();

        if (!roomDoc.exists) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Room not found.' }) };
        }
        const roomData = roomDoc.data();
        if (roomData.ownerId !== userId) {
            return { statusCode: 403, body: JSON.stringify({ message: 'You are not the room owner.' }) };
        }

        let adminMessage = '';
        let targetUserId = null;
        let targetUsername = null;

        switch (command) {
            case '!kick':
                if (args.length === 0) return { statusCode: 400, body: JSON.stringify({ message: 'Usage: !kick <username>' }) };
                targetUsername = args.join(' ');
                const memberToKick = roomData.members.find(m => m.username.toLowerCase() === targetUsername.toLowerCase());
                if (memberToKick) {
                    if (memberToKick.userId === userId) {
                         return { statusCode: 400, body: JSON.stringify({ message: 'Cannot kick yourself.' }) };
                    }
                    await roomRef.update({ members: FieldValue.arrayRemove(memberToKick) });
                    adminMessage = `${targetUsername} has been kicked from the room.`;
                    targetUserId = memberToKick.userId;
                    await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'kick', message: adminMessage, targetUserId: targetUserId });
                } else {
                    return { statusCode: 404, body: JSON.stringify({ message: `User '${targetUsername}' not found in room.` }) };
                }
                break;
            case '!ban':
                if (args.length === 0) return { statusCode: 400, body: JSON.stringify({ message: 'Usage: !ban <username>' }) };
                targetUsername = args.join(' ');
                const memberToBan = roomData.members.find(m => m.username.toLowerCase() === targetUsername.toLowerCase());
                if (memberToBan) {
                    if (memberToBan.userId === userId) {
                        return { statusCode: 400, body: JSON.stringify({ message: 'Cannot ban yourself.' }) };
                    }
                    await roomRef.update({
                        members: FieldValue.arrayRemove(memberToBan),
                        bannedUsers: FieldValue.arrayUnion(memberToBan.userId)
                    });
                    adminMessage = `${targetUsername} has been banned from the room.`;
                    targetUserId = memberToBan.userId;
                    await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'ban', message: adminMessage, targetUserId: targetUserId });
                } else {
                    return { statusCode: 404, body: JSON.stringify({ message: `User '${targetUsername}' not found in room.` }) };
                }
                break;
            case '!unban':
                if (args.length === 0) return { statusCode: 400, body: JSON.stringify({ message: 'Usage: !unban <username>' }) };
                targetUsername = args.join(' ');
                const membersWhoWereBanned = roomData.members.filter(m => roomData.bannedUsers.includes(m.userId));
                const userToUnban = membersWhoWereBanned.find(m => m.username.toLowerCase() === targetUsername.toLowerCase());

                if (userToUnban) {
                    await roomRef.update({ bannedUsers: FieldValue.arrayRemove(userToUnban.userId) });
                    adminMessage = `${userToUnban.username} has been unbanned.`;
                    await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'unban', message: adminMessage });
                } else {
                    return { statusCode: 404, body: JSON.stringify({ message: `User '${targetUsername}' not found in banned list or not correctly identified.` }) };
                }
                break;
            case '!kickall':
                const membersToKick = roomData.members.filter(m => m.userId !== userId);
                if (membersToKick.length > 0) {
                    await roomRef.update({ members: FieldValue.arrayRemove(...membersToKick) });
                    adminMessage = 'All members (except owner) have been kicked.';
                    await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'kickall', message: adminMessage });
                } else {
                    return { statusCode: 400, body: JSON.stringify({ message: 'No other members to kick.' }) };
                }
                break;
            case '!banall':
                const membersToBan = roomData.members.filter(m => m.userId !== userId);
                const userIdsToBan = membersToBan.map(m => m.userId);
                if (userIdsToBan.length > 0) {
                    await roomRef.update({
                        members: FieldValue.arrayRemove(...membersToBan),
                        bannedUsers: FieldValue.arrayUnion(...userIdsToBan)
                    });
                    adminMessage = 'All members (except owner) have been banned.';
                    await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'banall', message: adminMessage });
                } else {
                    return { statusCode: 400, body: JSON.stringify({ message: 'No other members to ban.' }) };
                }
                break;
            case '!lockroom':
                if (roomData.isLocked) {
                    return { statusCode: 400, body: JSON.stringify({ message: 'Room is already locked.' }) };
                }
                await roomRef.update({ isLocked: true });
                adminMessage = 'Room has been locked. Only whitelisted users can join.';
                await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'lockroom', message: adminMessage });
                break;
            case '!unlockroom':
                if (!roomData.isLocked) {
                    return { statusCode: 400, body: JSON.stringify({ message: 'Room is not locked.' }) };
                }
                await roomRef.update({ isLocked: false });
                adminMessage = 'Room has been unlocked. Anyone can join.';
                await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'unlockroom', message: adminMessage });
                break;
            case '!whitelist':
                if (args.length === 0) return { statusCode: 400, body: JSON.stringify({ message: 'Usage: !whitelist on/off/on add <username>/on remove <username>' }) };
                const whitelistAction = args[0].toLowerCase();
                if (whitelistAction === 'on') {
                    if (args.length === 1) {
                        adminMessage = 'Whitelist is set to ON. Make sure room is locked for it to take effect.';
                        await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'whitelist_status', message: adminMessage });
                    } else if (args[1].toLowerCase() === 'add') {
                        const userToAddName = args.slice(2).join(' ');
                        const userToAdd = roomData.members.find(m => m.username.toLowerCase() === userToAddName.toLowerCase());
                        if (userToAdd) {
                            if (roomData.whitelistedUsers && roomData.whitelistedUsers.includes(userToAdd.userId)) {
                                return { statusCode: 400, body: JSON.stringify({ message: `'${userToAddName}' is already whitelisted.` }) };
                            }
                            await roomRef.update({ whitelistedUsers: FieldValue.arrayUnion(userToAdd.userId) });
                            adminMessage = `${userToAddName} added to whitelist.`;
                            await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'whitelist_add', message: adminMessage });
                        } else {
                            return { statusCode: 404, body: JSON.stringify({ message: `User '${userToAddName}' not found in room to whitelist.` }) };
                        }
                    } else if (args[1].toLowerCase() === 'remove') {
                        const userToRemoveName = args.slice(2).join(' ');
                        const userToRemove = roomData.members.find(m => m.username.toLowerCase() === userToRemoveName.toLowerCase());
                        if (userToRemove && roomData.whitelistedUsers && roomData.whitelistedUsers.includes(userToRemove.userId)) {
                            await roomRef.update({ whitelistedUsers: FieldValue.arrayRemove(userToRemove.userId) });
                            adminMessage = `${userToRemoveName} removed from whitelist.`;
                            await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'whitelist_remove', message: adminMessage });
                        } else {
                            return { statusCode: 404, body: JSON.stringify({ message: `User '${userToRemoveName}' not found in whitelist.` }) };
                        }
                    } else {
                        return { statusCode: 400, body: JSON.stringify({ message: 'Usage: !whitelist on/off/on add <username>/on remove <username>' }) };
                    }
                } else if (whitelistAction === 'off') {
                    adminMessage = 'Whitelist is now OFF. Room access determined by lock status.';
                    await pusher.trigger(`private-${roomCode}`, 'client-admin-message', { action: 'whitelist_status', message: adminMessage });
                } else {
                    return { statusCode: 400, body: JSON.stringify({ message: 'Unknown whitelist action.' }) };
                }
                break;
            default:
                return { statusCode: 400, body: JSON.stringify({ message: `Unknown command: ${command}` }) };
        }
        return { statusCode: 200, body: JSON.stringify({ message: adminMessage }) };
    } catch (error) {
        console.error('Error handling admin command:', error);
        return { statusCode: 500, body: JSON.stringify({ message: `Server error: ${error.message}` }) };
    }
};
