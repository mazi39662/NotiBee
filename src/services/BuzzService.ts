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
  image?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
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

    // Prevent duplicates and update existing (e.g. status changes)
    const index = buzzes.value.findIndex(b => b.id === newBuzz.id);
    if (index !== -1) {
      const updatedBuzzes = [...buzzes.value];
      updatedBuzzes[index] = { ...updatedBuzzes[index], ...newBuzz };
      buzzes.value = updatedBuzzes;
    } else {
      // Use array spread to ensure reactivity triggers in all contexts
      const newList = [newBuzz, ...buzzes.value];
      // Limit history
      if (newList.length > 50) {
        buzzes.value = newList.slice(0, 50);
      } else {
        buzzes.value = newList;
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
    } catch (e) {
      console.warn('⚠️ LocalStorage full! History might not be saved.', e);
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

  const addReceivedBuzz = (sender: string, message: string, image?: string, audioUrl?: string, duration?: number, msgId?: string, type?: string, timestamp?: string, time?: string) => {
    const buzz: Buzz = {
      id: msgId || 'rx_' + Date.now().toString(),
      sender,
      recipient: 'You',
      message,
      image,
      audioUrl,
      duration,
      time: time || new Date().toLocaleTimeString(),
      status: 'delivered',
      timestamp: timestamp || new Date().toISOString(),
      reactions: {},
      type
    };
    saveToLocal(buzz);
  };

  const addSentBuzz = (recipient: string, message: string, senderId: string, image?: string, audioUrl?: string, duration?: number, msgId?: string, forceStatus?: Buzz['status'], type?: string, timestamp?: string, time?: string) => {
    const buzz: Buzz = {
      id: msgId || 'tx_' + Date.now().toString(),
      sender: senderId,
      recipient,
      message,
      image,
      audioUrl,
      duration,
      time: time || new Date().toLocaleTimeString(),
      status: forceStatus || 'sent',
      timestamp: timestamp || new Date().toISOString(),
      reactions: {},
      type
    };
    saveToLocal(buzz);
  };

  const updateBuzzStatus = (msgId: string, status: Buzz['status']) => {
    const index = buzzes.value.findIndex(b => b.id === msgId);
    if (index !== -1) {
      const updated = [...buzzes.value];
      updated[index] = { ...updated[index], status };
      buzzes.value = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
    }
  };

  /**
   * 👂 The FREE Relay Listener
   * Watches the specific "inbox" of this Bee ID in Firestore.
   */
  const initInboxListener = (beeId: string, onMessage: (sender: string, msg: string, image?: string, type?: string, roomId?: string, audioUrl?: string, duration?: number, metadata?: any) => void) => {
    const inboxRef = collection(db, 'users', beeId, 'inbox');
    const q = query(inboxRef);

    return onSnapshot(q, async (snapshot) => {
      // Pre-import notification service once per snapshot if changes exist
      let notifyService: any = null;
      if (snapshot.docChanges().length > 0) {
        notifyService = await import('./NotificationService').then(m => m.useNotificationService());
      }

      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const data = change.doc.data();

          try {
            if (data.from !== beeId) {
              if (data.type === 'REACTION') {
                if (data.msgId) updateLocalReaction(data.msgId, data.emoji, data.from);

                // If it has a message (anonymous reaction), show in notifications
                if (data.message && notifyService) {
                  notifyService.addNotification(data.from, data.message, 'REACTION');
                }
              }
              else if (data.type === 'READ_RECEIPT') {
                updateLocalMessageStatus(data.msgId, 'read');
              } else {
                // 1. ADD TO HISTORY FIRST - Crucial for immediate UI update
                const isMessage = !data.type || data.type === 'BUZZ' || data.type === 'AUDIO' || data.type === 'ROOM_BUZZ' || data.type === 'ROOM_BUZZ_AUDIO';

                if (isMessage) {
                  const msgTimestamp = data.timestamp || new Date().toISOString();
                  let msgTime = new Date().toLocaleTimeString();
                  try {
                    msgTime = new Date(msgTimestamp).toLocaleTimeString();
                  } catch (e) { /* fallback to now */ }

                  addReceivedBuzz(data.from, data.message, data.image, data.audioUrl, data.duration, data.msgId, data.type, msgTimestamp, msgTime);
                  incrementUnread(data.from);
                }

                // 2. TRIGGER ONMESSAGE CALLBACK (e.g. for local notifications, call redirect)
                onMessage(data.from, data.message, data.image, data.type, data.roomId, data.audioUrl, data.duration, data.metadata);

                // 3. TRIGGER INTERNAL APP NOTIFICATION (if applicable)
                if (notifyService && (!isMessage || ['MISSED_CALL', 'STREAK', 'ACHIEVEMENT', 'UPDATE'].includes(data.type))) {
                  notifyService.addNotification(data.from, data.message || 'Sent a buzz! 🐝', data.type || 'BUZZ');
                }
              }
            }
          } catch (err) {
            console.error('Error processing inbox item:', err);
          } finally {
            // ALWAYS delete from Firestore immediately after processing
            try {
              await deleteDoc(change.doc.ref);
            } catch (e) {
              console.error('Failed to cleanup inbox item', e);
            }
          }
        }
      }
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
        message: 'You',
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

    const updated = [...buzzes.value];
    const buzz = { ...updated[index] };
    const reactions = { ...(buzz.reactions || {}) };
    const users = [...(reactions[emoji] || [])];

    if (users.includes(userBeeId)) {
      reactions[emoji] = users.filter(id => id !== userBeeId);
    } else {
      reactions[emoji] = [...users, userBeeId];
    }

    buzz.reactions = reactions;
    updated[index] = buzz;
    buzzes.value = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buzzes.value));
  };

  /* READ RECEIPTS */
  const updateLocalMessageStatus = (msgId: string, status: 'read' | 'delivered') => {
    const index = buzzes.value.findIndex(b => b.id === msgId);
    if (index !== -1) {
      const updated = [...buzzes.value];
      updated[index] = { ...updated[index], status };
      buzzes.value = updated;
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
            message: 'You',
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
