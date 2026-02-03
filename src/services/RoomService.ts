import { ref } from 'vue';
import { db } from './FirebaseService';
import { useUserService } from './UserService';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    doc,
    setDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    arrayUnion,
    arrayRemove,
    orderBy,
    limit,
    writeBatch
} from 'firebase/firestore';

export interface Room {
    id: string;
    name: string;
    members: string[];
    owner: string;
    createdAt: number;
    lastMessage?: string;
    lastMessageTime?: number;
}

export interface RoomBuzz {
    id: string;
    sender: string;
    message: string;
    image?: string;
    audioUrl?: string;
    duration?: number;
    timestamp: number;
    reactions?: Record<string, string[]>;
    status?: 'sending' | 'sent' | 'error';
}

export interface RoomStory {
    id: string;
    roomId: string;
    beeId: string;
    imageUrl?: string;
    textContent?: string;
    backgroundColor?: string;
    createdAt: number;
    expiresAt: number;
    views: string[]; // Array of beeIds who viewed
}

const rooms = ref<Room[]>([]);
const currentRoomBuzzes = ref<RoomBuzz[]>([]);
const currentRoomStories = ref<RoomStory[]>([]);
const isLoading = ref(false);

export const useRoomService = () => {
    const userBeeId = localStorage.getItem('bee_id');

    /**
     * Fetch rooms from the User's personal 'rooms' subcollection
     */
    const fetchRooms = () => {
        if (!userBeeId) return;

        isLoading.value = true;
        // OLD: collection(db, 'rooms')
        // NEW: collection(db, 'users', userBeeId, 'rooms')
        const q = query(
            collection(db, 'users', userBeeId, 'rooms')
        );

        return onSnapshot(q, (snapshot) => {
            rooms.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Room[];
            isLoading.value = false;
        });
    };

    /**
     * Create Room: Distributes the room data to ALL initial members
     */
    const createRoom = async (name: string, members: string[]) => {
        if (!userBeeId) return;

        // Generate a random ID for the room (we won't create a global doc, just use the ID)
        // We can use a pure random string or a doc ref.
        const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        const allMembers = [...new Set([userBeeId, ...members])];

        const newRoom: Room = {
            id: roomId,
            name,
            members: allMembers,
            owner: userBeeId,
            createdAt: Date.now()
        };

        const batch = writeBatch(db);

        // Replicate room data to each User's subcollection
        allMembers.forEach(memberId => {
            const userRoomRef = doc(db, 'users', memberId, 'rooms', roomId);
            batch.set(userRoomRef, newRoom);
        });

        await batch.commit();
        return roomId;
    };

    /**
     * Helper to update a field in ALL members' copies of the room
     */
    const updateRoomCopies = async (roomId: string, data: any, currentMembers?: string[]) => {
        // We typically need to know the members to find their docs. 
        // We can assume 'rooms.value' has the current room if we are the owner/member.
        let members = currentMembers;

        if (!members) {
            const room = rooms.value.find(r => r.id === roomId);
            if (room) members = room.members;
        }

        // Fallback: If we don't have local data, we can't easily update everyone without querying (which requires global list).
        // Since the User assumes distributed storage, we assume we have the list available in the caller or locally.
        if (!members || members.length === 0) return;

        const batch = writeBatch(db);
        members.forEach(memberId => {
            const ref = doc(db, 'users', memberId, 'rooms', roomId);
            batch.update(ref, data);
        });
        await batch.commit();
    };


    const initRoomBuzzListener = (roomId: string, ownerId: string) => {
        const q = query(
            collection(db, 'users', ownerId, 'rooms', roomId, 'buzzes'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            currentRoomBuzzes.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RoomBuzz[];
        });
    };

    const sendRoomBuzz = async (roomId: string, message: string, ownerId: string, image?: string) => {
        if (!userBeeId) return;

        const buzz = {
            sender: userBeeId,
            message,
            image: image || null,
            timestamp: Date.now(),
            reactions: {}
        };

        // 1. Add to shared buzzes under owner's doc
        await addDoc(collection(db, 'users', ownerId, 'rooms', roomId, 'buzzes'), buzz);

        // 2. Update last message in ALL copies
        await updateRoomCopies(roomId, {
            lastMessage: message,
            lastMessageTime: Date.now()
        });

        // 3. Notify all other members via inbox and dispatch
        const currentRoom = rooms.value.find(r => r.id === roomId);
        if (currentRoom) {
            const otherMembers = currentRoom.members.filter(m => m !== userBeeId);
            const { getRecipientToken } = useUserService();

            for (const memberId of otherMembers) {
                try {
                    // Real-time inbox for foreground
                    const recipientInboxRef = collection(db, 'users', memberId, 'inbox');
                    await addDoc(recipientInboxRef, {
                        from: userBeeId,
                        message: `[${currentRoom.name}] ${message}`,
                        image: image || null,
                        type: 'ROOM_BUZZ',
                        roomId: roomId,
                        timestamp: new Date().toISOString()
                    });

                    // Background dispatch for push
                    const { token } = await getRecipientToken(memberId);
                    if (token) {
                        const dispatchRef = collection(db, 'dispatch');
                        await addDoc(dispatchRef, {
                            to: token,
                            title: `🐝 Hive: ${currentRoom.name}`,
                            body: `${userBeeId}: ${message}`,
                            data: {
                                senderId: String(userBeeId),
                                message: String(message),
                                type: 'ROOM_BUZZ',
                                roomId: String(roomId)
                            },
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.error(`Failed to notify member ${memberId}`, e);
                }
            }
        }
    };

    const sendRoomAudioBuzz = async (roomId: string, audioUrl: string, duration: number, ownerId: string) => {
        if (!userBeeId) return;

        const buzz = {
            sender: userBeeId,
            message: '🎙️ Audio Message',
            audioUrl,
            duration,
            timestamp: Date.now(),
            reactions: {}
        };

        await addDoc(collection(db, 'users', ownerId, 'rooms', roomId, 'buzzes'), buzz);

        await updateRoomCopies(roomId, {
            lastMessage: '🎙️ Audio Message',
            lastMessageTime: Date.now()
        });

        const currentRoom = rooms.value.find(r => r.id === roomId);
        if (currentRoom) {
            const otherMembers = currentRoom.members.filter(m => m !== userBeeId);
            const { getRecipientToken } = useUserService();

            for (const memberId of otherMembers) {
                try {
                    await addDoc(collection(db, 'users', memberId, 'inbox'), {
                        from: userBeeId,
                        message: `[${currentRoom.name}] 🎙️ Audio Message`,
                        audioUrl,
                        duration,
                        type: 'ROOM_BUZZ_AUDIO',
                        roomId: roomId,
                        timestamp: new Date().toISOString()
                    });

                    const { token } = await getRecipientToken(memberId);
                    if (token) {
                        await addDoc(collection(db, 'dispatch'), {
                            to: token,
                            title: `🐝 Hive: ${currentRoom.name}`,
                            body: `${userBeeId} sent an audio buzz`,
                            data: {
                                senderId: String(userBeeId),
                                message: '🎙️ Audio Message',
                                audioUrl: String(audioUrl),
                                duration: String(duration),
                                type: 'ROOM_BUZZ_AUDIO',
                                roomId: String(roomId)
                            },
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.error(`Failed to notify ${memberId}`, e);
                }
            }
        }
    };

    const reactToBuzz = async (roomId: string, buzzId: string, emoji: string, ownerId: string) => {
        if (!userBeeId) return;

        const buzzRef = doc(db, 'users', ownerId, 'rooms', roomId, 'buzzes', buzzId);
        const buzz = currentRoomBuzzes.value.find(b => b.id === buzzId);
        if (!buzz) return;

        const currentReactions = buzz.reactions || {};
        const userReactions = currentReactions[emoji] || [];

        if (userReactions.includes(userBeeId)) {
            await updateDoc(buzzRef, {
                [`reactions.${emoji}`]: arrayRemove(userBeeId)
            });
        } else {
            await updateDoc(buzzRef, {
                [`reactions.${emoji}`]: arrayUnion(userBeeId)
            });
        }
    };

    const fetchRoomStories = (roomId: string, ownerId: string) => {
        const now = Date.now();
        const q = query(
            collection(db, 'users', ownerId, 'rooms', roomId, 'stories'),
            where('expiresAt', '>', now),
            orderBy('expiresAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            currentRoomStories.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RoomStory[];
        });
    };

    const postRoomStory = async (roomId: string, ownerId: string, data: Partial<RoomStory>) => {
        if (!userBeeId) return;

        const now = Date.now();
        const story = {
            roomId,
            beeId: userBeeId,
            createdAt: now,
            expiresAt: now + (24 * 60 * 60 * 1000), // 24h
            views: [],
            ...data
        };

        await addDoc(collection(db, 'users', ownerId, 'rooms', roomId, 'stories'), story);
    };

    const markRoomStoryAsViewed = async (roomId: string, ownerId: string, storyId: string) => {
        if (!userBeeId) return;

        try {
            const story = currentRoomStories.value.find(s => s.id === storyId);
            if (story && !story.views.includes(userBeeId)) {
                const storyRef = doc(db, 'users', ownerId, 'rooms', roomId, 'stories', storyId);
                await updateDoc(storyRef, {
                    views: arrayUnion(userBeeId)
                });
                const { addHoneyDrops } = await import('./HoneyService').then(m => m.useHoneyService());
                await addHoneyDrops('VIEW');
            }
        } catch (error) {
            console.error('Error marking room story as viewed:', error);
        }
    };

    const deleteRoom = async (roomId: string) => {
        // Delete copies from ALL members
        const room = rooms.value.find(r => r.id === roomId);
        if (room) {
            const batch = writeBatch(db);
            room.members.forEach(memberId => {
                const ref = doc(db, 'users', memberId, 'rooms', roomId);
                batch.delete(ref);
            });
            await batch.commit();
        }
    };

    const updateRoomName = async (roomId: string, newName: string) => {
        await updateRoomCopies(roomId, { name: newName });
    };

    const addRoomMember = async (roomId: string, memberId: string) => {
        const room = rooms.value.find(r => r.id === roomId);
        if (!room) return;

        const newMembers = [...room.members, memberId];

        const batch = writeBatch(db);

        // 1. Update existing members' copies
        room.members.forEach(existingId => {
            const ref = doc(db, 'users', existingId, 'rooms', roomId);
            batch.update(ref, { members: newMembers });
        });

        // 2. Create copy for NEW member
        const newMemberRef = doc(db, 'users', memberId, 'rooms', roomId);
        batch.set(newMemberRef, { ...room, members: newMembers }); // Copy current state including name, etc.

        await batch.commit();
    };

    const removeRoomMember = async (roomId: string, memberId: string) => {
        const room = rooms.value.find(r => r.id === roomId);
        if (!room) return;

        const newMembers = room.members.filter(m => m !== memberId);
        const batch = writeBatch(db);

        // 1. Update remaining members' copies
        newMembers.forEach(remainingId => {
            const ref = doc(db, 'users', remainingId, 'rooms', roomId);
            batch.update(ref, { members: newMembers });
        });

        // 2. Delete copy from REMOVED member
        const removedRef = doc(db, 'users', memberId, 'rooms', roomId);
        batch.delete(removedRef);

        await batch.commit();
    };

    return {
        rooms,
        currentRoomBuzzes,
        currentRoomStories,
        isLoading,
        fetchRooms,
        createRoom,
        initRoomBuzzListener,
        sendRoomBuzz,
        fetchRoomStories,
        postRoomStory,
        deleteRoom,
        updateRoomName,
        addRoomMember,
        removeRoomMember,
        sendRoomAudioBuzz,
        reactToBuzz,
        markRoomStoryAsViewed
    };
};
