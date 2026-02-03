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

const { initPush, sendLocalBuzz } = usePushService();
const { shouldNotify } = useNotificationService();
const { userBeeId } = useUserService();
const { initInboxListener, processOutbox } = useBuzzService();
const { initTheme } = useThemeService();
const { isOnline } = useNetworkService();
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
                    console.warn('Background location skip:', e);
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
        console.log('🔐 Auth State Changed:', user?.uid);
        currentUser.value = user;
    });

    // Handle App State (Foreground/Background)
    App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
            console.log('📱 App Active: Starting heartbeat');
            startHeartbeat();
        } else {
            console.log('💤 App Background: Stopping heartbeat');
            stopHeartbeat();
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
        console.log(`🎬 Bee radio tuning into: ${newBeeId}`);
        unsubscribeInbox = initInboxListener(newBeeId, async (sender: string, msg: string, image?: string, type?: string, roomId?: string) => {
            sendLocalBuzz(sender, msg, image, type, roomId);
            
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
                } else {
                    Haptics.impact({ style: ImpactStyle.Heavy });
                }
            }
        });
        
        // Initial online status update
        updateOnlineStatus();
    }
}, { immediate: true });

// Watch for network restoration to auto-send failed messages
watch(isOnline, (online) => {
    if (online) {
        console.log('📡 Connection restored! Processing outbox...');
        processOutbox();
    }
});
</script>
