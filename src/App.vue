<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, alertController } from '@ionic/vue';
import { usePushService } from '@/services/PushService';
import { useUserService } from '@/services/UserService';
import { useBuzzService } from '@/services/BuzzService';
import { auth, initFirebase } from '@/services/FirebaseService';
import { onMounted, watch, ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNetworkService } from '@/services/NetworkService';
import { useNotificationService } from '@/services/NotificationService';

import { useThemeService } from '@/services/ThemeService';
import { Geolocation } from '@capacitor/geolocation';
import { useUpdateService } from '@/services/UpdateService';
import { useCallService } from '@/services/CallService';


const { initPush, sendLocalBuzz } = usePushService();
const { shouldNotify } = useNotificationService();
const { userBeeId } = useUserService();
const { initInboxListener, processOutbox } = useBuzzService();
const { initTheme } = useThemeService();
const { isOnline } = useNetworkService();
const { initPeer, callState } = useCallService();
const router = useRouter();


const currentUser = ref(auth.currentUser);
const { updateOnlineStatus, userVisibility, updateLocation } = useUserService();
let heartbeatTimer: any = null;

const startHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(async () => {
        if (userBeeId.value && currentUser.value) {
            updateOnlineStatus();
            
            // If visibility is on, update location too using Capacitor for better reliability
            if (userVisibility.value) {
                try {
                    const position = await Geolocation.getCurrentPosition({
                        enableHighAccuracy: false, // Low accuracy is fine for background
                        timeout: 15000 // Increased from 5s to 15s
                    });
                    if (position && position.coords) {
                        updateLocation(position.coords.latitude, position.coords.longitude, true);
                    }
                } catch (e) {
                }
            }
        }
    }, 45000); // 45 seconds to be gentler on battery
    updateOnlineStatus(); 
};

const stopHeartbeat = () => {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
};

onMounted(async () => {
    await initFirebase();
    
    // Check for updates after Firebase is ready
    const { checkForUpdate } = useUpdateService();
    checkForUpdate();

    initPush();
    initTheme();
    
    // Track auth state reactively
    auth.onAuthStateChanged((user) => {
        currentUser.value = user;
    });

    // Handle App State (Foreground/Background)
    App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
            startHeartbeat();
            
            // Re-verify Peer connection to prevent stale session errors
            const { initPeer, destroyPeer, callState } = useCallService();
            if (userBeeId.value && currentUser.value) {
                // Aggressively clear error state to hide the 'Blocked' modal
                callState.value.error = undefined; 
                destroyPeer();
                // Wait 2 seconds before re-init to allow server to clear the stale ID
                setTimeout(() => initPeer(), 2000);
            }
        } else {
            stopHeartbeat();
            // On background, it's safer to disconnect Peer to prevent stale session on server
            const { destroyPeer } = useCallService();
            destroyPeer();
        }
    });



    // Initial start if already active
    startHeartbeat();
});

onUnmounted(() => {
    stopHeartbeat();
    App.removeAllListeners();
});

let unsubscribeInbox: (() => void) | null = null;

// Start listener only when BOTH Bee ID and Auth are ready
watch([userBeeId, currentUser], ([newBeeId, user]) => {
    // Cleanup old listener if it exists
    if (unsubscribeInbox) {
        unsubscribeInbox();
        unsubscribeInbox = null;
    }

    if (newBeeId && user) {
        unsubscribeInbox = initInboxListener(newBeeId, async (sender: string, msg: string, image?: string, type?: string, roomId?: string) => {
            const { stopRingingHaptics, endCall } = useCallService();
            
            if (type === 'CALL_REJECTED' || type === 'CALL_ENDED' || type === 'CALL_DISMISSED') {
                stopRingingHaptics();
                endCall();
                return; 
            }


            sendLocalBuzz(sender, msg, image, type, roomId);
            
            if (type === 'CALL_REACTION') {
                callState.value.lastReaction = { 
                    sender: sender, 
                    emoji: msg, 
                    id: Date.now() 
                };
                return;
            }

            
            // Show Alert for Friend Requests
            if (type === 'FRIEND_REQUEST') {
                const alert = await alertController.create({
                    header: 'New Bee Request! 🐝',
                    message: `${sender} ${msg}`,
                    cssClass: 'custom-alert',
                    buttons: [
                        { text: 'Later', role: 'cancel' },
                        { 
                            text: 'View', 
                            handler: () => { router.push('/tabs/tab1'); } 
                        }
                    ]
                });
                await alert.present();
            }

            // Respect Notification Preferences for Haptics
            if (shouldNotify(type as any || 'BUZZ')) {
                if (type === 'VIBRATE') {
                    // Long pulse for forced vibrations
                    Haptics.vibrate({ duration: 500 });
                } else if (type === 'CALL_REQUEST') {
                    // Redirect to call page immediately for incoming calls
                    const { callState } = useCallService();
                    callState.value.incomingCall = true;
                    callState.value.remotePeerId = sender;
                    router.push('/call');
                } else {
                    Haptics.impact({ style: ImpactStyle.Heavy });
                }
            }
        });
        
        // Initial online status update
        updateOnlineStatus();

        // Initialize PeerJS
        initPeer();
    }
}, { immediate: true });


// Watch for network restoration to auto-send failed messages
watch(isOnline, (online) => {
    if (online) {
        processOutbox();
    }
});

// 📞 Global Call Navigation Watcher (Covers both Signaling & PeerJS paths)
watch(() => callState.value.incomingCall, (incoming) => {
    if (incoming && router.currentRoute.value.path !== '/call') {
        router.push('/call');
    }
});

</script>
