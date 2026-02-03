<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="radar-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab1" color="primary"></ion-back-button>
        </ion-buttons>
        <ion-title>Bee Radar</ion-title>
        <ion-buttons slot="end">
            <ion-button @click="toggleVisibility" :color="visibility ? 'primary' : 'medium'">
                <ion-icon :icon="visibility ? eye : eyeOff"></ion-icon>
            </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="radar-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content 
            :pulling-icon="chevronDown"
            pulling-text="Pull to scan"
            refreshing-spinner="bubbles"
            refreshing-text="Scouting area..."
        ></ion-refresher-content>
      </ion-refresher>

      <div class="radar-container">
        
        <!-- Signal Status Overlay -->
        <div v-if="!userLocation || signalError" class="locating-overlay animate-in">
            <template v-if="signalError">
                <ion-icon :icon="alertCircleOutline" color="danger" size="large"></ion-icon>
                <p class="error-text">{{ signalError }}</p>
                <ion-button fill="outline" color="primary" size="small" @click="retrySignal" class="retry-btn">
                    RETRY SIGNAL
                </ion-button>
            </template>
            <template v-else>
                <ion-spinner name="crescent" color="primary"></ion-spinner>
                <p>Acquiring GPS Signal...</p>
            </template>
        </div>

        <!-- Radar Grid -->
        <div class="radar-outer-glow" :class="{ 'signal-lost': !userLocation || signalError }">
            <div class="radar-disk">
                <div class="radar-ring ring-1"></div>
                <div class="radar-ring ring-2"></div>
                <div class="radar-ring ring-3"></div>
                <div class="radar-ring ring-4"></div>
                
                <div class="radar-axis-h"></div>
                <div class="radar-axis-v"></div>

                <!-- Sweep Animation -->
                <div class="radar-sweep-container" :class="{ 'anim-paused': !userLocation }">
                    <div class="radar-sweep"></div>
                </div>

                <!-- Self Dot (The Center Bee) -->
                <div class="self-dot" v-if="userLocation">
                    <div class="self-ping"></div>
                    <span class="emoji">🐝</span>
                </div>

                <!-- Detected Bees -->
                <div 
                    v-for="bee in nearbyBees" 
                    :key="bee.beeId"
                    class="bee-dot-container"
                    :style="getJitteredPosition(bee)"
                    @click="handleBeeClick(bee)"
                >
                    <div class="bee-dot detected">
                        <div class="dot-inner"></div>
                        <span class="bee-emoji">🐝</span>
                        <!-- <div class="bee-id-tag">{{ bee.beeId }}</div> -->
                        <div class="bee-dist-tag">{{ formatDistance(bee.distance) }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Radar Stats -->
        <div class="radar-stats-card glass-panel gold-glow">
            <div class="stat-item">
                <span class="label">STATUS</span>
                <span class="value" :class="{ 'active': visibility }">{{ visibility ? 'ONLINE' : 'HIDDEN' }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
                <span class="label">NEARBY</span>
                <span class="value gold-text">{{ nearbyBees.length }} BEES</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
                <span class="label">RANGE</span>
                <span class="value">5 KM</span>
            </div>
        </div>

        <div class="radar-controls">
            <p v-if="!visibility" class="visibility-warning">
                You are hidden from other bees. Turn on visibility to be seen on their radar.
            </p>
            <p v-else-if="nearbyBees.length === 0 && userLocation" class="visibility-info">
                No bees detected in your radius yet. Scouting...
            </p>
            <p v-else class="visibility-info">
                {{ userLocation ? 'Broadcasting your location to nearby bees.' : 'Check your location permissions.' }}
            </p>
        </div>
      </div>

      <!-- Bee Detail Modal -->
       <ion-modal 
        :is-open="isProfileOpen" 
        @didDismiss="isProfileOpen = false"
        :initial-breakpoint="0.45"
        :breakpoints="[0, 0.45, 0.75]"
        handle="true"
        class="bee-profile-modal"
      >
        <div class="modal-wrapper" v-if="selectedBee">
            <div class="modal-header">
                <div class="large-avatar-hex" @click="goToProfile(selectedBee?.beeId)" style="cursor: pointer;">
                    <div class="hexagon hex-glow">🐝</div>
                </div>
                <h2 @click="goToProfile(selectedBee?.beeId)" style="cursor: pointer;">{{ selectedBee.beeId }}</h2>
                <div @click="goToProfile(selectedBee?.beeId)" class="view-profile-link">VIEW PROFILE</div>
                <p>{{ formatDistance(selectedBee.distance) }} away from you</p>
            </div>
            <div class="modal-body">
                <ion-button v-if="isFriend" expand="block" shape="round" fill="outline" color="primary" disabled>
                    FRIENDS
                    <ion-icon :icon="checkmarkCircleOutline" slot="end"></ion-icon>
                </ion-button>
                <ion-button v-else expand="block" class="gold-glow-btn" @click="handleRequestFriend" :disabled="isRequesting">
                    {{ isRequesting ? 'SENDING...' : 'ADD FRIEND' }}
                    <ion-icon :icon="personAddOutline" slot="end"></ion-icon>
                </ion-button>
            </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, 
  IonButtons, IonBackButton, IonIcon, IonButton, IonModal,
  alertController, toastController, IonSpinner, IonRefresher, IonRefresherContent
} from '@ionic/vue';
import { eye, eyeOff, flash, alertCircleOutline, chevronDown, personAddOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useUserService } from '@/services/UserService';
import { useBuzzService } from '@/services/BuzzService';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { useRouter } from 'vue-router';

const { 
    userBeeId, userVisibility: visibility, getVisibleBees, 
    updateLocation, updateVisibility, getFriends, sendFriendRequest 
} = useUserService();
const { sendVibrate } = useBuzzService();
const router = useRouter();
const friends = getFriends();
const isFriend = computed(() => {
    if (!selectedBee.value || !friends.value) return false;
    return friends.value.includes(selectedBee.value.beeId);
});

const userLocation = ref<{ lat: number, lng: number } | null>(null);
const visibleBees = getVisibleBees();
const isProfileOpen = ref(false);
const selectedBee = ref<any>(null);
const mockBees = ref<any[]>([]);
const isRequesting = ref(false);

// Map to store random positions so they stay stable while the user is on the radar
const positionCache = new Map<string, { x: number, y: number }>();

const getPersistentRandomPosition = (beeId: string) => {
    if (positionCache.has(beeId)) return positionCache.get(beeId);
    
    // Generate random angle and radius within the disk (160px max)
    // Avoid center (30px min)
    const angle = Math.random() * Math.PI * 2;
    const radius = 40 + (Math.random() * 110); // Between 40px and 150px
    
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    const pos = { x, y };
    positionCache.set(beeId, pos);
    return pos;
};

// Radar Settings
const MAX_RANGE_KM = 5;

const nearbyBees = computed(() => {
    if (!userLocation.value) return [];
    
    const friendList = friends.value || [];
    
    const realBees = visibleBees.value
        .filter(bee => {
            const isMe = bee.beeId === userBeeId.value;
            const isFriend = friendList.includes(bee.beeId);
            return !isMe && bee.location && !isFriend;
        })
        .map(bee => {
            const dist = calculateDistance(
                userLocation.value!.lat, 
                userLocation.value!.lng, 
                bee.location.lat, 
                bee.location.lng
            );
            
            const bearing = calculateBearing(
                userLocation.value!.lat, 
                userLocation.value!.lng, 
                bee.location.lat, 
                bee.location.lng
            );

            return { ...bee, distance: dist, bearing: bearing };
        })
        .filter(bee => bee.distance <= MAX_RANGE_KM);

    // Also filter mock bees against friends list just in case
    const filteredMockBees = mockBees.value.filter(bee => !friendList.includes(bee.beeId));

    return [...realBees, ...filteredMockBees].sort((a, b) => a.distance - b.distance);
});

// Helper to get a stable random position for visual variety
const getJitteredPosition = (bee: any) => {
    const pos = getPersistentRandomPosition(bee.beeId);
    return {
        transform: `translate(calc(160px + ${pos?.x}px), calc(160px + ${pos?.y}px))`
    };
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
};

// getBeePosition removed in favor of getJitteredPosition

const formatDistance = (dist: number) => {
    if (dist < 1) return `${Math.round(dist * 1000)}m`;
    return `${dist.toFixed(1)}km`;
};

const toggleVisibility = async () => {
    await updateVisibility(!visibility.value);
    Haptics.impact({ style: ImpactStyle.Medium });
    
    // Refresh location if turning on
    if (visibility.value) {
        getCurrentPosition();
    }

    const toast = await toastController.create({
        message: visibility.value ? 'You are now visible on the Radar' : 'You are now hidden from other bees',
        duration: 2000,
        color: visibility.value ? 'primary' : 'medium',
        position: 'top'
    });
    await toast.present();
};

let lastClickTime = 0;
let clickTimer: any = null;

const handleBeeClick = (bee: any) => {
    const currentTime = new Date().getTime();
    const delay = 300; // ms

    if (currentTime - lastClickTime < delay) {
        // Double tap detected
        clearTimeout(clickTimer);
        lastClickTime = 0;
        triggerVibration(bee);
    } else {
        // Single tap suspected
        lastClickTime = currentTime;
        clickTimer = setTimeout(() => {
            openBeeProfile(bee);
            lastClickTime = 0;
        }, delay);
    }
};

const triggerVibration = async (bee: any) => {
    if (bee.isMock) {
        Haptics.notification({ type: ImpactStyle.Medium as any });
        return;
    }

    if (!userBeeId.value) return;

    try {
        await sendVibrate(bee.beeId, userBeeId.value);
        Haptics.impact({ style: ImpactStyle.Heavy });
        
        const toast = await toastController.create({
            message: `Sent a shockwave to ${bee.beeId}! ⚡`,
            duration: 1500,
            color: 'primary',
            position: 'top'
        });
        await toast.present();
    } catch (e) {
        console.error('Vibrate failed:', e);
    }
};

const openBeeProfile = (bee: any) => {
    selectedBee.value = bee;
    isProfileOpen.value = true;
    Haptics.impact({ style: ImpactStyle.Light });
};

const goToProfile = (beeId: string | undefined) => {
    if (!beeId) return;
    isProfileOpen.value = false;
    setTimeout(() => {
        router.push(`/tabs/profile/${beeId}`);
    }, 100);
};

const handleRefresh = async (event: any) => {
    Haptics.impact({ style: ImpactStyle.Light });
    await getCurrentPosition();
    setTimeout(() => {
        event.target.complete();
    }, 1000);
};

const handleSendBuzz = () => {
    if (selectedBee.value) {
        isProfileOpen.value = false;
        router.push({ path: '/tabs/tab1', query: { openBee: selectedBee.value.beeId } });
    }
};

const handleRequestFriend = async () => {
    if (!selectedBee.value || isRequesting.value) return;
    
    // Don't allow requesting mock bees
    if (selectedBee.value.isMock) {
        const toast = await toastController.create({
            message: "You can't enlist a scout bee! Find real bees in the wild.",
            duration: 2000,
            color: 'warning'
        });
        await toast.present();
        return;
    }

    try {
        isRequesting.value = true;
        await sendFriendRequest(selectedBee.value.beeId);
        Haptics.notification({ type: ImpactStyle.Heavy as any });
        
        const toast = await toastController.create({
            message: `Summoning request sent to ${selectedBee.value.beeId}!`,
            duration: 2000,
            color: 'primary'
        });
        await toast.present();
        isProfileOpen.value = false;
    } catch (e) {
        console.error('Friend request failed:', e);
    } finally {
        isRequesting.value = false;
    }
};

let watchId: string | null = null;

const signalError = ref<string | null>(null);

const getCurrentPosition = async () => {
    signalError.value = null;
    try {
        // First attempt with high accuracy
        try {
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 30000 // Increased to 30s
            });
            userLocation.value = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            if (visibility.value && position?.coords) {
                updateLocation(position.coords.latitude, position.coords.longitude, true);
            }
            return;
        } catch (highAccErr: any) {
            console.warn('High accuracy location failed, retrying with low accuracy', highAccErr);
            // Fallback to low accuracy if high accuracy fails or times out
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: false,
                timeout: 15000
            });
            userLocation.value = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            if (visibility.value && position?.coords) {
                updateLocation(position.coords.latitude, position.coords.longitude, true);
            }
        }
    } catch (e: any) {
        console.warn('Location error', e);
        // Code 3 is timeout
        if (e.code === 3) {
            signalError.value = 'GPS signal is weak. Try moving to a clearer area.';
        } else {
            signalError.value = e.message || 'Signal lost or timeout.';
        }
    }
};

const startTracking = async () => {
    try {
        signalError.value = null;
        const permissions = await Geolocation.checkPermissions();
        
        if (permissions.location !== 'granted') {
            const { location } = await Geolocation.requestPermissions();
            if (location !== 'granted') {
                const alert = await alertController.create({
                    header: 'Location Required 📍',
                    message: 'Radar needs GPS access to find nearby bees. Please enable it in your device settings.',
                    buttons: [
                        { text: 'Cancel', role: 'cancel' },
                        { text: 'Settings', handler: () => {
                            (App as any).openSettings();
                        }}
                    ]
                });
                await alert.present();
                signalError.value = 'Location permission denied.';
                return;
            }
        }
        
        await getCurrentPosition();
        
        watchId = await Geolocation.watchPosition({
            enableHighAccuracy: true,
            timeout: 30000 // Increased to 30s
        }, (position, err) => {
            if (position) {
                signalError.value = null;
                userLocation.value = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                if (visibility.value && position?.coords) {
                    updateLocation(position.coords.latitude, position.coords.longitude, true);
                }
            } else if (err) {
                // Code 3 is timeout - we don't want to show a scary error for transient timeouts in watch
                if (err.code !== 3) {
                    console.error('Watch error:', err);
                } else {
                    console.warn('Watch timeout - still waiting for signal...');
                }
            }
        });

        // Add a mock bee after 3 seconds if none found, for testing
        setTimeout(() => {
            if (nearbyBees.value.length === 0) {
                mockBees.value = [{
                    beeId: 'betabee',
                    distance: 0.8, // 800m
                    bearing: Math.random() * 360,
                    isMock: true
                }];
            }
        }, 3000);
    } catch (e) {
        console.error('Start tracking error:', e);
        signalError.value = 'Failed to initialize radar tracking.';
    }
};

const retrySignal = () => {
    startTracking();
};

onMounted(() => {
    startTracking();
    Haptics.impact({ style: ImpactStyle.Heavy });
});

onUnmounted(() => {
    if (watchId) {
        Geolocation.clearWatch({ id: watchId });
    }
});
</script>

<style scoped>
.radar-toolbar {
    --background: transparent;
    --color: var(--ion-color-primary);
}

.radar-content {
    --background: var(--ion-background-color);
}

.radar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
    height: 100%;
    padding: 20px;
    position: relative;
}

.locating-overlay {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
    text-align: center;
    background: rgba(0,0,0,0.7);
    padding: 20px;
    border-radius: 20px;
    backdrop-filter: blur(5px);
}

.locating-overlay p {
    margin-top: 10px;
    color: var(--ion-color-primary);
    font-size: 14px;
    font-weight: 700;
}

.radar-outer-glow {
    position: relative;
    padding: 15px;
    border-radius: 50%;
    background: radial-gradient(circle at center, rgba(255, 191, 0, 0.1) 0%, transparent 80%);
    transition: opacity 0.5s;
}

.radar-outer-glow.signal-lost {
    opacity: 0.3;
}

.radar-disk {
    width: 320px;
    height: 320px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 191, 0, 0.3);
    position: relative;
    backdrop-filter: blur(10px);
    overflow: hidden;
}

.radar-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 1px solid rgba(255, 191, 0, 0.15);
    border-radius: 50%;
}

.ring-1 { width: 80px; height: 80px; }
.ring-2 { width: 160px; height: 160px; }
.ring-3 { width: 240px; height: 240px; }
.ring-4 { width: 320px; height: 320px; border-color: rgba(255, 191, 0, 0.3); }

.radar-axis-h, .radar-axis-v {
    position: absolute;
    background: rgba(255, 191, 0, 0.1);
}
.radar-axis-h { width: 100%; height: 1px; top: 50%; }
.radar-axis-v { height: 100%; width: 1px; left: 50%; }

.radar-sweep-container {
    position: absolute;
    width: 100%;
    height: 100%;
    animation: sweep 4s linear infinite;
}

.radar-sweep-container.anim-paused {
    animation-play-state: paused;
}

.radar-sweep {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 160px;
    height: 160px;
    background: conic-gradient(from 180deg at 0% 0%, rgba(255, 191, 0, 0.3) 0deg, transparent 60deg);
    transform-origin: 0% 0%;
}

@keyframes sweep {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.self-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 8; /* Below detected bees but above grid */
    pointer-events: none;
}

.self-ping {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--ion-color-primary);
    opacity: 0.3;
    animation: self-ping 2s ease-out infinite;
    pointer-events: none;
}

@keyframes self-ping {
    0% { transform: scale(0.6); opacity: 0.3; }
    100% { transform: scale(8); opacity: 0; }
}

.self-dot .emoji {
    font-size: 26px;
    filter: drop-shadow(0 0 10px var(--ion-color-primary));
}

.bee-dot-container {
    position: absolute;
    width: 0;
    height: 0;
    z-index: 15; /* Highest layer inside disk */
}

.bee-dot {
    width: 32px; /* Larger hit area */
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(-50%, -50%);
    position: relative;
    cursor: pointer;
}

.bee-emoji {
    font-size: 20px;
    filter: drop-shadow(0 0 5px var(--ion-color-primary));
}

.bee-dot.detected { animation: ping 4s linear infinite; }

@keyframes ping {
    0%, 15% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
    50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; }
}

.dot-inner {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: inherit;
    border-radius: 50%;
    animation: pulse 1.5s ease-out infinite;
    pointer-events: none;
}

@keyframes pulse {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(4.5); opacity: 0; }
}

.bee-id-tag {
    position: absolute;
    top: -26px;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
    text-shadow: 0 0 6px #000;
    letter-spacing: 0.5px;
}

.bee-dist-tag {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255,255,255,0.8);
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
}

.radar-stats-card {
    width: 92%;
    max-width: 400px;
    display: flex;
    justify-content: space-around;
    padding: 24px 12px;
    border-radius: 22px;
    background: rgba(255, 191, 0, 0.03) !important;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
}

.stat-item .label {
    font-size: 11px;
    font-weight: 800;
    color: rgba(255,191,0,0.4);
    letter-spacing: 1.5px;
    margin-bottom: 8px;
}

.stat-item .value {
    font-size: 18px;
    font-weight: 900;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.value.active {
    color: var(--ion-color-success);
    text-shadow: 0 0 12px rgba(45, 211, 111, 0.4);
}

.stat-divider {
    width: 1px;
    height: 25px;
    background: rgba(255,191,0,0.15);
}

.radar-controls {
    text-align: center;
    max-width: 320px;
}

.visibility-warning {
    color: var(--ion-color-danger);
    font-size: 14px;
    font-weight: 600;
    font-style: italic;
    line-height: 1.6;
}

.visibility-info {
    color: rgba(255,255,255,0.6);
    font-size: 14px;
}

.gold-text { color: var(--ion-color-primary); }

.bee-profile-modal {
    --border-radius: 32px 32px 0 0;
    --background: var(--ion-background-color);
}

.modal-wrapper {
    padding: 24px 20px 40px;
    background: var(--ion-background-color);
    text-align: center;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    min-height: 100%;
}

.large-avatar-hex {
  width: 104px;
  height: 90px;
  margin: 0 auto 15px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-profile-link {
    font-size: 10px;
    font-weight: 800;
    color: var(--ion-color-primary);
    letter-spacing: 1.5px;
    margin: 0 auto 15px;
    cursor: pointer;
    display: inline-block;
    padding: 2px 10px;
    background: rgba(255, 191, 0, 0.1);
    border-radius: 20px;
    border: 1px solid rgba(255, 191, 0, 0.2);
    width: fit-content;
}

.hexagon {
  width: 100%;
  height: 100%;
  background: var(--ion-color-primary);
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  transition: transform 0.3s ease;
}

.hex-glow {
    box-shadow: 0 0 25px rgba(255, 191, 0, 0.4);
}

.gold-glow-btn {
    --background: var(--ion-color-primary);
    --color: #000;
    font-weight: 800;
    --border-radius: 14px;
    height: 52px;
    box-shadow: 0 4px 15px rgba(255, 191, 0, 0.3);
    margin-top: 10px;
}

.animate-in {
    animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
