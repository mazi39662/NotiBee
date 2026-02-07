import { ref } from 'vue';
import { db } from './FirebaseService';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    Timestamp,
    getDocs,
    updateDoc
} from 'firebase/firestore';
import { userBeeId, useUserService } from './UserService';

export interface AnonymousMessage {
    id: string;
    toBeeId: string;
    fromBeeId?: string;
    content: string;
    timestamp: number;
    expiresAt: number;
    colorTheme: string;
    isRead: boolean;
    reaction?: string;
    invitePrompt?: string;
}

export const useAnonymousService = () => {
    const messages = ref<AnonymousMessage[]>([]);
    const isLoading = ref(false);

    const fetchMessages = () => {
        if (!userBeeId.value) return () => { };

        isLoading.value = true;
        // Fetch all messages for user and filter/sort locally to avoid complex index requirements
        const q = query(
            collection(db, 'anonymous_messages'),
            where('toBeeId', '==', userBeeId.value)
        );

        return onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const allMsgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AnonymousMessage[];

            // Filter expired and sort by most recent locally
            messages.value = allMsgs
                .filter(m => m.expiresAt > now)
                .sort((a, b) => b.expiresAt - a.expiresAt);

            isLoading.value = false;
        }, (error) => {
            console.error("Error fetching anonymous messages:", error);
            isLoading.value = false;
        });
    };

    const sendMessage = async (toBeeId: string, content: string, colorTheme: string, fromBeeId?: string, invitePrompt?: string) => {
        const now = Date.now();
        const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now

        const newMessage = {
            toBeeId,
            fromBeeId: fromBeeId || null,
            content,
            timestamp: now,
            expiresAt,
            colorTheme,
            isRead: false,
            invitePrompt: invitePrompt || null
        };

        await addDoc(collection(db, 'anonymous_messages'), newMessage);
    };

    const sendReaction = async (message: AnonymousMessage, reaction: string) => {
        // 1. Update the message with the reaction
        const messageRef = doc(db, 'anonymous_messages', message.id);
        await updateDoc(messageRef, { reaction });

        // 2. Notify the original sender if they exist
        if (message.fromBeeId) {
            try {
                const inboxRef = collection(db, 'users', message.fromBeeId, 'inbox');
                await addDoc(inboxRef, {
                    from: message.toBeeId,
                    message: `reacted ${reaction} to your secret message!`,
                    type: 'REACTION',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        originalMessage: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '')
                    }
                });

                // Also send a push notification dispatch
                const { getRecipientToken } = useUserService();
                const { token } = await getRecipientToken(message.fromBeeId);

                if (token) {
                    const dispatchRef = collection(db, 'dispatch');
                    await addDoc(dispatchRef, {
                        to: token,
                        title: '🤫 Secret Reaction!',
                        body: `Someone reacted ${reaction} to your secret message!`,
                        data: {
                            type: 'REACTION',
                            reaction: reaction
                        },
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Error sending reaction notification:", err);
            }
        }
    };

    const deleteMessage = async (messageId: string) => {
        await deleteDoc(doc(db, 'anonymous_messages', messageId));
    };

    const cleanupExpiredMessages = async () => {
        const now = Date.now();
        const q = query(
            collection(db, 'anonymous_messages'),
            where('expiresAt', '<=', now)
        );

        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, 'anonymous_messages', document.id)));
        await Promise.all(deletePromises);
    };

    const clearInbox = async () => {
        if (!userBeeId.value) return;
        const q = query(
            collection(db, 'anonymous_messages'),
            where('toBeeId', '==', userBeeId.value)
        );
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, 'anonymous_messages', document.id)));
        await Promise.all(deletePromises);
    };

    return {
        messages,
        isLoading,
        fetchMessages,
        sendMessage,
        sendReaction,
        deleteMessage,
        cleanupExpiredMessages,
        clearInbox
    };
};
