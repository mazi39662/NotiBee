import { ref } from 'vue';
import { db } from './FirebaseService';
import { collection, onSnapshot, query, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { useAudioService } from './AudioService';
import { useUserService } from './UserService';

export interface Buzz {
  id: string;
  sender: string;
  recipient: string;
  message: string;
  image?: string;
  audioUrl?: string;
  duration?: number;
  time: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  timestamp: string;
  reactions?: Record<string, string[]>;
  type?: string;
}

const STORAGE_KEY = 'notibee_history';
const SETTINGS_KEY = 'notibee_settings_history';

const buzzes = ref<Buzz[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
const saveHistoryEnabled = ref<boolean>(localStorage.getItem(SETTINGS_KEY) !== 'false');

interface OutboxItem {
  id: string;
  type: 'BUZZ' | 'VIBRATE' | 'AUDIO';
  recipientId: string;
  message?: string;
  senderId: string;
  recipientToken?: string;
  image?: string;
  audioUrl?: string;
  duration?: number;
  timestamp: string;
}

const OUTBOX_KEY = 'notibee_outbox';
const UNREAD_KEY = 'notibee_unread_counts';

const outbox = ref<OutboxItem[]>(JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'));
const unreadCounts = ref<Record<string, number>>(JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}'));

export const useBuzzService = () => {

  const incrementUnread = (beeId: string) => {
    unreadCounts.value[beeId] = (unreadCounts.value[beeId] || 0) + 1;
    localStorage.setItem(UNREAD_KEY, JSON.stringify(unreadCounts.value));
  };

  const clearUnread = (beeId: string) => {
    if (unreadCounts.value[beeId]) {
      delete unreadCounts.value[beeId];
      localStorage.setItem(UNREAD_KEY, JSON.stringify(unreadCounts.value));
    }
  };

  const toggleHistory = (val: boolean) => {
    saveHistoryEnabled.value = val;
    localStorage.setItem(SETTINGS_KEY, val.toString());
    if (!val) {
      clearHistory();
    }
  };

  const saveToLocal = (newBuzz: Buzz) => {
    if (!saveHistoryEnabled.value) return;

    // Prevent duplicates
    const index = buzzes.value.findIndex(b => b.id === newBuzz.id);
    if (index !== -1) {
      buzzes.value[index] = { ...buzzes.value[index], ...newBuzz };
    } else {
      buzzes.value.unshift(newBuzz);
    }

    // Limit history - if we have many images, 50 might hit the 5MB localStorage limit
    // We'll keep 50 messages, but maybe fewer if they are large?
    // For now, let's stick to 50 but ensure we don't crash.
    if (buzzes.value.length > 50) {
      buzzes.value = buzzes.value.slice(0, 50);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
    } catch (e) {
      console.warn('⚠️ LocalStorage full! History might not be saved.', e);
      // If full, try keeping only the 10 most recent to clear some space
      if (buzzes.value.length > 10) {
        buzzes.value = buzzes.value.slice(0, 10);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
        } catch (e2) {
          console.error('❌ Still failing to save to LocalStorage', e2);
        }
      }
    }
  };

  const addReceivedBuzz = (sender: string, message: string, image?: string, audioUrl?: string, duration?: number, msgId?: string, type?: string) => {
    const buzz: Buzz = {
      id: msgId || 'rx_' + Date.now().toString(),
      sender,
      recipient: 'You',
      message,
      image,
      audioUrl,
      duration,
      time: new Date().toLocaleTimeString(),
      status: 'delivered',
      timestamp: new Date().toISOString(),
      reactions: {},
      type
    };
    saveToLocal(buzz);
  };

  const addSentBuzz = (recipient: string, message: string, senderId: string, image?: string, audioUrl?: string, duration?: number, msgId?: string, forceStatus?: Buzz['status'], type?: string) => {
    const buzz: Buzz = {
      id: msgId || 'tx_' + Date.now().toString(),
      sender: senderId,
      recipient,
      message,
      image,
      audioUrl,
      duration,
      time: new Date().toLocaleTimeString(),
      status: forceStatus || 'sent',
      timestamp: new Date().toISOString(),
      reactions: {},
      type
    };
    saveToLocal(buzz);
  };

  const updateBuzzStatus = (msgId: string, status: Buzz['status']) => {
    const index = buzzes.value.findIndex(b => b.id === msgId);
    if (index !== -1) {
      buzzes.value[index] = { ...buzzes.value[index], status };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
    }
  };

  /**
   * 👂 The FREE Relay Listener
   * Watches the specific "inbox" of this Bee ID in Firestore.
   */
  const initInboxListener = (beeId: string, onMessage: (sender: string, msg: string, image?: string, type?: string, roomId?: string, audioUrl?: string, duration?: number) => void) => {
    const inboxRef = collection(db, 'users', beeId, 'inbox');
    const q = query(inboxRef);

    return onSnapshot(q, async (snapshot) => {
      const { addNotification } = await import('./NotificationService').then(m => m.useNotificationService());

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();

          // If the message is from ourselves, skip processing it as a "received" message
          // because sendBuzz already added it to our local "sent" history.
          // Process the message
          try {
            // Self-buzz check
            if (data.from === beeId) {
              // Self-buzzes are already handled locally or irrelevant for notification
            } else {
              if (data.type === 'REACTION') {
                updateLocalReaction(data.msgId, data.emoji, data.from);
              } else if (data.type === 'READ_RECEIPT') {
                updateLocalMessageStatus(data.msgId, 'read');
              } else {
                onMessage(data.from, data.message, data.image, data.type, data.roomId, data.audioUrl, data.duration);

                // Add to global notification list
                addNotification(data.from, data.message || 'Sent a buzz! 🐝', data.type || 'BUZZ');

                // Only save to history if it's a standard message or has content
                if (!data.type || data.type === 'BUZZ' || data.type === 'AUDIO' || data.type === 'ROOM_BUZZ' || data.type === 'ROOM_BUZZ_AUDIO') {
                  addReceivedBuzz(data.from, data.message, data.image, data.audioUrl, data.duration, data.msgId, data.type);
                  incrementUnread(data.from);
                }
              }
            }
          } catch (err) {
            console.error('Error processing inbox item:', err);
          } finally {
            // ALWAYS delete the message from Firestore to keep inbox ephemeral
            try {
              await deleteDoc(change.doc.ref);
            } catch (e) {
              console.error('Failed to cleanup inbox item', e);
            }
          }
        }
      });
    }, (error) => {
      console.error('❌ Inbox Listener Error:', error);
    });
  };

  const clearHistory = () => {
    buzzes.value = [];
    localStorage.removeItem(STORAGE_KEY);
  };

  const deleteBuzz = (msgId: string) => {
    buzzes.value = buzzes.value.filter(b => b.id !== msgId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
  };

  const deleteConversation = (beeId: string) => {
    buzzes.value = buzzes.value.filter(b => b.sender !== beeId && b.recipient !== beeId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
    clearUnread(beeId);
  };

  const sendBuzz = async (recipientId: string, message: string, senderId: string, recipientToken: string, image?: string) => {
    const sharedId = 'buzz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    // Add to local history immediately for UX
    addSentBuzz(recipientId, message, senderId, image, undefined, undefined, sharedId, 'sending', 'BUZZ');

    try {
      // 1. Write to RECIPIENT'S inbox for real-time bubble (Foreground / Free Relay)
      const inboxRef = collection(db, 'users', recipientId, 'inbox');
      await addDoc(inboxRef, {
        from: senderId,
        message: message,
        image: image || null,
        type: 'BUZZ',
        msgId: sharedId,
        timestamp: new Date().toISOString()
      });

      // 2. Write to DISPATCH collection for Background Push (FCM)
      if (recipientToken) {
        const dispatchRef = collection(db, 'dispatch');
        await addDoc(dispatchRef, {
          to: recipientToken,
          title: `🐝 Buzz from ${senderId}`,
          body: message,
          data: {
            senderId: String(senderId),
            message: String(message),
            image: String(image || ''),
            type: 'BUZZ',
            msgId: String(sharedId)
          },
          timestamp: new Date().toISOString()
        });
      }

      updateBuzzStatus(sharedId, 'sent');
    } catch (e) {
      console.error('❌ sendBuzz failed (adding to outbox):', e);
      updateBuzzStatus(sharedId, 'error');
      addToOutbox({
        id: sharedId,
        type: 'BUZZ',
        recipientId,
        message,
        senderId,
        recipientToken,
        image,
        timestamp: new Date().toISOString()
      });
      throw e;
    }
  };

  const sendAudioBuzz = async (recipientId: string, audioUrl: string, duration: number, senderId: string, recipientToken: string) => {
    const sharedId = 'audio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const { deleteFromStorage } = useAudioService();

    // Add to local history immediately
    addSentBuzz(recipientId, '🎙️ Audio Message', senderId, undefined, audioUrl, duration, sharedId, 'sending', 'AUDIO');

    try {
      const inboxRef = collection(db, 'users', recipientId, 'inbox');
      await addDoc(inboxRef, {
        from: senderId,
        message: '🎙️ Audio Message',
        audioUrl,
        duration,
        type: 'AUDIO',
        msgId: sharedId,
        timestamp: new Date().toISOString()
      });

      if (recipientToken) {
        const dispatchRef = collection(db, 'dispatch');
        await addDoc(dispatchRef, {
          to: recipientToken,
          title: `🐝 Voice buzz from ${senderId}`,
          body: '🎙️ Audio Message',
          data: {
            senderId,
            message: '🎙️ Audio Message',
            audioUrl,
            duration: duration.toString(),
            type: 'AUDIO',
            msgId: sharedId
          },
          timestamp: new Date().toISOString()
        });
      }

      updateBuzzStatus(sharedId, 'sent');

      // 🕒 AUTO-DESTRUCT: Delete from cloud after 2 minutes
      setTimeout(() => {
        deleteFromStorage(audioUrl);
      }, 120000);

    } catch (e) {
      console.error('❌ sendAudioBuzz failed:', e);
      updateBuzzStatus(sharedId, 'error');
      throw e;
    }
  };

  const sendVibrate = async (recipientId: string, senderId: string, recipientToken?: string) => {
    try {
      // 1. Foreground trigger
      const inboxRef = collection(db, 'users', recipientId, 'inbox');
      await addDoc(inboxRef, {
        from: senderId,
        message: 'vibrated your device! ⚡',
        type: 'VIBRATE',
        timestamp: new Date().toISOString()
      });

      // 2. Background trigger
      if (recipientToken) {
        const dispatchRef = collection(db, 'dispatch');
        await addDoc(dispatchRef, {
          to: recipientToken,
          title: '🐝 NotiBee Shockwave!',
          body: `${senderId} sent you a vibration!`,
          data: {
            senderId,
            type: 'VIBRATE'
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('❌ sendVibrate failed (adding to outbox):', e);
      addToOutbox({
        id: 'out_vib_' + Date.now(),
        type: 'VIBRATE',
        recipientId,
        senderId,
        recipientToken,
        timestamp: new Date().toISOString()
      });
    }
  };

  const updateLocalReaction = (msgId: string, emoji: string, userBeeId: string) => {
    const index = buzzes.value.findIndex(b => b.id === msgId);
    if (index === -1) return;

    const buzz = buzzes.value[index];
    const reactions = buzz.reactions || {};
    const users = reactions[emoji] || [];

    if (users.includes(userBeeId)) {
      reactions[emoji] = users.filter(id => id !== userBeeId);
    } else {
      reactions[emoji] = [...users, userBeeId];
    }

    buzzes.value[index] = { ...buzz, reactions };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
  };

  /* READ RECEIPTS */
  const updateLocalMessageStatus = (msgId: string, status: 'read' | 'delivered') => {
    const index = buzzes.value.findIndex(b => b.id === msgId);
    if (index !== -1) {
      buzzes.value[index] = { ...buzzes.value[index], status };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
    }
  };

  const sendReadReceipt = async (recipientId: string, msgId: string, senderId: string) => {
    try {
      const inboxRef = collection(db, 'users', recipientId, 'inbox');
      await addDoc(inboxRef, {
        from: senderId,
        type: 'READ_RECEIPT',
        msgId,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to send read receipt', e);
    }
  };

  const sendBuzzReaction = async (recipientId: string, msgId: string, emoji: string, senderId: string) => {
    // 1. Update local immediately
    updateLocalReaction(msgId, emoji, senderId);

    try {
      // 2. Send to recipient inbox
      const inboxRef = collection(db, 'users', recipientId, 'inbox');
      await addDoc(inboxRef, {
        from: senderId,
        type: 'REACTION',
        msgId,
        emoji,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('failed to send reaction', e);
    }
  };

  const addToOutbox = (item: OutboxItem) => {
    outbox.value.push(item);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.value));
  };

  const processOutbox = async () => {
    if (outbox.value.length === 0) return;

    const items = [...outbox.value];
    outbox.value = [];
    localStorage.setItem(OUTBOX_KEY, '[]');

    for (const item of items) {
      try {
        if (item.type === 'BUZZ') {
          // Use direct firestore calls to avoid adding to history again
          const inboxRef = collection(db, 'users', item.recipientId, 'inbox');
          await addDoc(inboxRef, {
            from: item.senderId,
            message: item.message,
            image: item.image || null,
            type: 'BUZZ',
            msgId: item.id,
            timestamp: item.timestamp
          });

          if (item.recipientToken) {
            const dispatchRef = collection(db, 'dispatch');
            await addDoc(dispatchRef, {
              to: item.recipientToken,
              title: `🐝 Buzz from ${item.senderId}`,
              body: item.message,
              data: {
                senderId: item.senderId,
                message: item.message,
                image: item.image || '',
                type: 'BUZZ',
                msgId: item.id
              },
              timestamp: item.timestamp
            });
          }
        } else if (item.type === 'VIBRATE') {
          const inboxRef = collection(db, 'users', item.recipientId, 'inbox');
          await addDoc(inboxRef, {
            from: item.senderId,
            message: 'vibrated your device! ⚡',
            type: 'VIBRATE',
            timestamp: item.timestamp
          });

          if (item.recipientToken) {
            const dispatchRef = collection(db, 'dispatch');
            await addDoc(dispatchRef, {
              to: item.recipientToken,
              title: '🐝 NotiBee Shockwave!',
              body: `${item.senderId} sent you a vibration!`,
              data: {
                senderId: item.senderId,
                type: 'VIBRATE'
              },
              timestamp: item.timestamp
            });
          }
        }
      } catch (e) {
        console.error('❌ Failed to process outbox item, re-queueing:', e);
        addToOutbox(item);
      }
    }
  };

  const getBuzzesForBee = (beeId: string) => {
    return buzzes.value.filter(b =>
      (b.sender === beeId || b.recipient === beeId) &&
      b.type !== 'ROOM_BUZZ' &&
      b.type !== 'ROOM_BUZZ_AUDIO'
    );
  };

  return {
    buzzes,
    saveHistoryEnabled,
    toggleHistory,
    addReceivedBuzz,
    initInboxListener,
    clearHistory,
    sendBuzz,
    sendAudioBuzz,
    sendVibrate,
    getBuzzesForBee,
    outbox,
    processOutbox,
    sendBuzzReaction,
    unreadCounts,
    incrementUnread,
    clearUnread,
    sendReadReceipt,
    updateBuzzStatus,
    deleteBuzz,
    deleteConversation
  };
};
