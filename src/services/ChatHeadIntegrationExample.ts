/**
 * ============================================
 * CHAT HEAD INTEGRATION EXAMPLE
 * ============================================
 * 
 * This file shows how to integrate chat heads into your existing code.
 * Copy the relevant sections into Tab1Page.vue or App.vue
 * 
 * NOTE: This is an EXAMPLE file with pseudo-code.
 * You'll need to adapt it to your actual component structure.
 */

// ============================================
// IMPORTS (Add these to your component)
// ============================================
import { ref, onMounted } from 'vue';
import { collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { alertController } from '@ionic/vue';
import { useChatHeadService } from '@/services/ChatHeadService';
import { useUserService } from '@/services/UserService';
import { useBuzzService } from '@/services/BuzzService';

// ============================================
// SETUP (Add to your component setup)
// ============================================
export function setupChatHeadIntegration() {
    // Get services
    const chatHeadService = useChatHeadService();
    const { userBeeId } = useUserService();
    const { clearUnread, unreadCounts } = useBuzzService();

    // Example state (these should already exist in your component)
    // const beeStates = ref<BeeState[]>([]);
    // const selectedBee = ref<BeeState | null>(null);
    // const isModalOpen = ref(false);

    // ============================================
    // 1. REQUEST PERMISSION ON APP START
    // ============================================
    onMounted(async () => {
        if (chatHeadService.isSupported()) {
            const hasPermission = await chatHeadService.checkPermission();

            if (!hasPermission) {
                // You can request permission here or wait until first message
                // await chatHeadService.requestPermission();
            }
        }
    });

    // ============================================
    // 2. SHOW CHAT HEAD WHEN MESSAGE ARRIVES
    // ============================================
    // Add this to your existing initInboxListener function
    const initInboxListenerWithChatHeads = (
        db: any,
        beeStates: any,
        sendLocalBuzz: (buzz: any) => Promise<void>
    ) => {
        if (!userBeeId.value) return;

        const inboxRef = collection(db, `users/${userBeeId.value}/inbox`);

        const unsubscribeInbox = onSnapshot(inboxRef, async (snapshot: any) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const buzz = change.doc.data();

                    // ===== EXISTING CODE =====
                    // Your existing notification logic
                    await sendLocalBuzz(buzz);

                    // ===== NEW: CHAT HEAD INTEGRATION =====
                    // Only show chat head if app is in background or minimized
                    if (document.hidden || !document.hasFocus()) {
                        // Get sender's bee customization
                        const senderBee = beeStates.value.find((b: any) => b.beeId === buzz.sender);

                        if (senderBee && senderBee.customization) {
                            // Calculate unread count for this bee
                            const currentUnread = unreadCounts.value[buzz.sender] || 0;

                            // Show or update chat head
                            await chatHeadService.showChatHead(
                                buzz.sender,
                                buzz.message || (buzz.audioUrl ? '🎤 Voice message' : '📷 Photo'),
                                senderBee.customization,
                                currentUnread + 1
                            );
                        }
                    }

                    // ===== EXISTING CODE =====
                    // Delete from inbox
                    await deleteDoc(change.doc.ref);
                }
            }
        });

        return unsubscribeInbox;
    };

    // ============================================
    // 3. HIDE CHAT HEAD WHEN OPENING CONVERSATION
    // ============================================
    // Add this to your existing handleBeeClick function
    const handleBeeClickWithChatHead = async (
        bee: any,
        selectedBee: any,
        isModalOpen: any
    ) => {
        // ===== EXISTING CODE =====
        selectedBee.value = bee;
        isModalOpen.value = true;

        // ===== NEW: HIDE CHAT HEAD =====
        // Hide chat head when opening conversation
        await chatHeadService.hideChatHead();

        // Clear unread for this bee
        await clearUnread(bee.beeId);
    };

    // ============================================
    // 4. AUTO-HIDE WHEN APP COMES TO FOREGROUND
    // ============================================
    // Add this event listener in your component
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            // App is now visible, hide all chat heads
            await chatHeadService.removeAllChatHeads();
        }
    });

    // ============================================
    // 5. SETTINGS TOGGLE (Optional)
    // ============================================
    const chatHeadEnabled = ref(true);

    async function toggleChatHeads() {
        chatHeadEnabled.value = !chatHeadEnabled.value;

        if (chatHeadEnabled.value) {
            // Request permission if needed
            const granted = await chatHeadService.requestPermission();
            if (!granted) {
                chatHeadEnabled.value = false;

                // Show alert to user
                const alert = await alertController.create({
                    header: 'Permission Required',
                    message: 'Chat heads need permission to display over other apps. Please enable it in Settings.',
                    buttons: ['OK']
                });
                await alert.present();
            }
        } else {
            // Remove all chat heads
            await chatHeadService.removeAllChatHeads();
        }
    }

    // ============================================
    // 6. TEST FUNCTION (For Development)
    // ============================================
    async function testChatHead() {
        const service = useChatHeadService();

        if (!service.isSupported()) {
            console.log('Chat heads only work on Android');
            return;
        }

        const granted = await service.requestPermission();

        if (granted) {
            await service.showChatHead(
                'TEST_BEE_123',
                'Hey! This is a test message from the hive 🐝',
                {
                    top: 'top-1',
                    body: 'body-1',
                    eyes: 'eye-1',
                    accessories: ['acc-crown']
                },
                3
            );

            console.log('Chat head shown!');
        } else {
            console.log('Permission denied');
        }
    }

    return {
        chatHeadService,
        chatHeadEnabled,
        toggleChatHeads,
        testChatHead,
        initInboxListenerWithChatHeads,
        handleBeeClickWithChatHead
    };
}

// ============================================
// USAGE EXAMPLE IN YOUR COMPONENT
// ============================================
/*

// In Tab1Page.vue or App.vue:

<script setup lang="ts">
import { setupChatHeadIntegration } from '@/services/ChatHeadIntegrationExample';

// Your existing code...
const { userBeeId } = useUserService();
const { sendLocalBuzz, clearUnread, unreadCounts } = useBuzzService();
const beeStates = ref<BeeState[]>([]);
const selectedBee = ref<BeeState | null>(null);
const isModalOpen = ref(false);

// Setup chat heads
const {
  chatHeadService,
  chatHeadEnabled,
  toggleChatHeads,
  testChatHead
} = setupChatHeadIntegration();

// Modify your inbox listener
const initInboxListener = () => {
  if (!userBeeId.value) return;
  
  const inboxRef = collection(db, `users/${userBeeId.value}/inbox`);
  
  unsubscribeInbox = onSnapshot(inboxRef, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const buzz = change.doc.data();
        
        // Existing notification
        await sendLocalBuzz(buzz);
        
        // NEW: Show chat head if app in background
        if (document.hidden) {
          const senderBee = beeStates.value.find(b => b.beeId === buzz.sender);
          if (senderBee?.customization) {
            await chatHeadService.showChatHead(
              buzz.sender,
              buzz.message || '📷 Photo',
              senderBee.customization,
              (unreadCounts.value[buzz.sender] || 0) + 1
            );
          }
        }
        
        await deleteDoc(change.doc.ref);
      }
    }
  });
};

// Modify your bee click handler
const handleBeeClick = async (bee: BeeState) => {
  selectedBee.value = bee;
  isModalOpen.value = true;
  
  // NEW: Hide chat head
  await chatHeadService.hideChatHead();
  await clearUnread(bee.beeId);
};
</script>

*/
