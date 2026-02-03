<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab1"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ beeId }}'s Profile</ion-title>
        <ion-buttons slot="end" v-if="!isMe">
          <ion-button color="danger" @click="handleReportUser">
            <ion-icon :icon="alertCircleOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="profile-content">
      <div v-if="loading" class="loading-state">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Fetching bee profile...</p>
      </div>

      <div v-else-if="userProfile" class="profile-container">
        <!-- Header Section -->
        <div class="profile-header glass-panel gold-glow">
          <div class="avatar-section">
            <div class="profile-bee-stage">
              <BeeComposite 
                :customization="userProfile.customization" 
                :animated="true"
                :scale="0.8"
              />
            </div>
            <div v-if="userProfile.isOnline" class="online-indicator"></div>
          </div>
          
          <div class="identity-section">
            <div class="identity-header">
              <h1>{{ userProfile.beeId }}</h1>
            </div>
            
            <div v-if="isMe" class="profile-me-actions">
              <ion-button expand="block" color="primary" class="customize-btn-large" @click="router.push('/tabs/customize-bee')">
                <ion-icon :icon="brushOutline" slot="start"></ion-icon>
                Customize My Bee
              </ion-button>
            </div>
            
            <div class="bio-container">
              <p v-if="!isEditingBio" class="bio-text">
                {{ userProfile.bio || "This bee hasn't shared a hum yet." }}
                <ion-button v-if="isMe" fill="clear" size="small" @click="startEditingBio" class="edit-bio-btn">
                  <ion-icon :icon="pencilOutline"></ion-icon>
                </ion-button>
              </p>
              <div v-else class="bio-edit-mode">
                <ion-textarea 
                  fill="outline" 
                  placeholder="Tell the Hive about yourself..." 
                  v-model="tempBio"
                  auto-grow
                  :maxlength="150"
                  class="bio-input"
                ></ion-textarea>
                <div class="bio-edit-actions">
                  <ion-button size="small" fill="clear" color="medium" @click="isEditingBio = false">Cancel</ion-button>
                  <ion-button size="small" fill="solid" color="primary" @click="saveBio">Save</ion-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Row - Pair-Based Streak -->
        <div v-if="!isMe && pairStreak" class="pair-streak-banner glass-panel gold-glow">
          <div class="pair-streak-header">
            <span class="bee-emoji">🐝</span>
            <h3>Your Connection</h3>
            <span class="bee-emoji">🐝</span>
          </div>
          <div class="pair-stats-row">
            <div class="pair-stat">
              <div class="pair-stat-icon">🔥</div>
              <div class="pair-stat-info">
                <span class="pair-stat-value">{{ pairStreak.currentStreak || 0 }}</span>
                <span class="pair-stat-label">CURRENT STREAK</span>
              </div>
            </div>
            <div class="pair-stat-divider"></div>
            <div class="pair-stat">
              <div class="pair-stat-icon">⚡</div>
              <div class="pair-stat-info">
                <span class="pair-stat-value">{{ pairStreak.totalBuzzes || 0 }}</span>
                <span class="pair-stat-label">BUZZES TOGETHER</span>
              </div>
            </div>
            <div class="pair-stat-divider"></div>
            <div class="pair-stat">
              <div class="pair-stat-icon">🏆</div>
              <div class="pair-stat-info">
                <span class="pair-stat-value">{{ pairStreak.longestStreak || 0 }}</span>
                <span class="pair-stat-label">BEST STREAK</span>
              </div>
            </div>
          </div>
          <div v-if="pairStreak.currentStreak > 0" class="streak-message">
            <p>🎉 Keep the buzz alive! Chat today to maintain your {{ pairStreak.currentStreak }}-day streak!</p>
          </div>
          <div v-else class="streak-message">
            <p>💬 Start chatting to begin your streak together!</p>
          </div>
        </div>

        <!-- Individual Stats (Visible on all profiles) -->
        <div class="stats-row">
          <div class="stat-card glass-panel">
            <div class="stat-icon">💧</div>
            <div class="stat-info">
              <span class="stat-value">{{ userProfile.lifetimeHoneyDrops || 0 }}</span>
              <span class="stat-label">HONEY DROPS</span>
            </div>
          </div>
          <div class="stat-card glass-panel">
            <div class="stat-icon">🍯</div>
            <div class="stat-info">
              <span class="stat-value">{{ userProfile.lifetimeJars || 0 }}</span>
              <span class="stat-label">TOTAL JARS</span>
            </div>
          </div>
          <div class="stat-card glass-panel" v-if="isMe || userProfile.longestStreak > 0">
            <div class="stat-icon">🔥</div>
            <div class="stat-info">
              <span class="stat-value">{{ userProfile.longestStreak || 0 }}</span>
              <span class="stat-label">BEST STREAK</span>
            </div>
          </div>
        </div>

        <!-- Stories Section (My Day) -->
        <div v-if="userStories.length > 0" class="stories-section section">
          <h2 class="section-title">
            <ion-icon :icon="cameraOutline"></ion-icon>
            Latest Stories
          </h2>
          <div class="stories-scroll">
            <div v-for="story in userStories" :key="story.id" class="story-card" @click="openStory(story)">
              <div v-if="story.imageUrl" class="story-image-wrap">
                <img :src="story.imageUrl" class="story-img" />
              </div>
              <div v-else class="story-text-wrap" :style="{ backgroundColor: story.backgroundColor || '#ffbf00' }">
                <p>{{ story.textContent }}</p>
              </div>
              <div class="story-time">{{ getTimeAgo(story.createdAt) }}</div>
            </div>
          </div>
        </div>


        <!-- Achievements Section -->
        <div class="achievements-section section">
          <h2 class="section-title">
            <ion-icon :icon="trophyOutline"></ion-icon>
            Badges Earned
          </h2>
          <div class="achievements-grid">
            <div 
              v-for="badge in allBadges" 
              :key="badge.id" 
              :class="['badge-item', { locked: !hasAchievement(badge.id) }]"
              @click="showBadgeDetails(badge)"
            >
              <div class="badge-icon glass-panel">
                <span class="icon">{{ badge.icon }}</span>
                <div v-if="hasAchievement(badge.id)" class="check-mark">✓</div>
              </div>
              <span class="badge-name">{{ badge.name }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="!isMe" class="profile-meta-actions">
           <ion-button 
             v-if="!isFriend" 
             expand="block" 
             shape="round" 
             color="primary" 
             @click="handleRequestFriend"
             :disabled="isRequesting"
           >
             <ion-icon :icon="personAddOutline" slot="start"></ion-icon>
             {{ isRequesting ? 'SENDING...' : 'ADD FRIEND' }}
           </ion-button>
           <ion-button v-else expand="block" shape="round" fill="outline" color="primary" disabled>
             <ion-icon :icon="checkmarkCircleOutline" slot="start"></ion-icon>
             FRIENDS
           </ion-button>
        </div>

        <!-- Profile Visitors Section (Moved to Bottom) -->
        <div v-if="isMe && visitors.length > 0" class="visitors-section section">
          <h2 class="section-title">
            <ion-icon :icon="eyeOutline"></ion-icon>
            Recent Visitors
          </h2>
          <div class="visitors-list glass-panel">
            <div 
              class="view-trigger-card" 
              @click="isVisitorsModalOpen = true"
            >
              <div class="visitor-preview-avatars">
                <div v-for="visitor in displayedVisitors.slice(0, 3)" :key="visitor.visitorId" class="preview-hex">
                  <BeeComposite 
                    :customization="getVisitorCustomization(visitor.visitorId)" 
                    :scale="0.12" 
                    :animated="true" 
                  />
                </div>
              </div>
              <div class="visitor-trigger-text">
                <h3>{{ visitors.length }} Bees checked your hive</h3>
                <p>Tap to see who visited</p>
              </div>
              <ion-icon :icon="chevronForwardOutline"></ion-icon>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="error-state">
        <span class="error-icon">😕</span>
        <h2>Bee not found</h2>
        <p>This bee might have flown to another hive.</p>
        <ion-button fill="clear" color="primary" @click="router.back()">Go Back</ion-button>
      </div>

      <!-- Story Modal -->
      <ion-modal :is-open="!!selectedStory" @didDismiss="selectedStory = null" class="story-viewer-modal">
        <div v-if="selectedStory" class="story-viewer-content">
          <div v-if="selectedStory.imageUrl" class="viewer-img-container">
            <img :src="selectedStory.imageUrl" />
          </div>
          <div v-else class="viewer-text-container" :style="{ backgroundColor: selectedStory.backgroundColor }">
            <p>{{ selectedStory.textContent }}</p>
          </div>
          
          <div class="viewer-overlay">
            <div class="viewer-header">
              <div class="viewer-info">
                <span class="viewer-bee">@{{ selectedStory.beeId }}</span>
                <span class="viewer-time">{{ getTimeAgo(selectedStory.createdAt) }}</span>
              </div>
              <ion-button fill="clear" color="light" @click="selectedStory = null">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </div>
            
            <div v-if="selectedStory.caption" class="viewer-caption">
              {{ selectedStory.caption }}
            </div>
          </div>
        </div>
      </ion-modal>

      <!-- Visitors Full List Modal -->
      <ion-modal
        :is-open="isVisitorsModalOpen"
        @didDismiss="isVisitorsModalOpen = false"
        :initial-breakpoint="0.5"
        :breakpoints="[0, 0.5, 0.8]"
        class="visitors-modal"
      >
        <div class="modal-container">
          <ion-header class="ion-no-border">
            <ion-toolbar>
              <ion-title>Profile Visitors</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="isVisitorsModalOpen = false">
                  <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <div class="full-visitors-list">
              <div 
                v-for="visitor in visitors" 
                :key="visitor.visitorId" 
                class="full-visitor-item"
                :class="{ 'is-blurred': !isActuallyFriend(visitor.visitorId) && !revealedVisitors.has(visitor.visitorId) }"
              >
                <div class="visitor-avatar">
                   <BeeComposite 
                     :customization="getVisitorCustomization(visitor.visitorId)" 
                     :scale="0.15" 
                     :animated="true" 
                   />
                </div>
                <div class="visitor-info">
                  <template v-if="isActuallyFriend(visitor.visitorId) || revealedVisitors.has(visitor.visitorId)">
                    <span class="visitor-name" @click="goToVisitorProfile(visitor.visitorId)">{{ visitor.visitorId }}</span>
                    <span class="visitor-time">{{ getTimeAgo(new Date(visitor.timestamp).getTime()) }}</span>
                  </template>
                  <template v-else>
                    <span class="visitor-name blurred-text">Unknown Bee</span>
                    <span class="visitor-time">Visited recently</span>
                  </template>
                </div>
                
                <div class="visitor-action" v-if="!isActuallyFriend(visitor.visitorId) && !revealedVisitors.has(visitor.visitorId)">
                   <ion-button fill="clear" size="small" @click="handleRevealVisitor(visitor.visitorId)">
                     <span style="font-size: 14px; margin-right: 4px;">🏺</span>
                     Reveal (1 Jar)
                   </ion-button>
                </div>
                <ion-icon v-else :icon="chevronForwardOutline" class="visitor-arrow" @click="goToVisitorProfile(visitor.visitorId)"></ion-icon>
              </div>
            </div>
          </ion-content>
        </div>
      </ion-modal>

      <!-- Badge Detail Modal -->
      <ion-modal
        :is-open="isBadgeModalOpen"
        @didDismiss="isBadgeModalOpen = false"
        class="badge-detail-modal"
        :initial-breakpoint="0.95"
        :breakpoints="[0, 0.95]"
      >
        <div class="badge-info-container" v-if="selectedBadge">
          <div class="badge-detail-header">
            <div class="badge-detail-hex glass-panel" :class="{ 'detail-locked': !hasAchievement(selectedBadge.id) }">
              <span class="detail-icon">{{ selectedBadge.icon }}</span>
            </div>
            <h2>{{ selectedBadge.name }}</h2>
            <div class="status-chip" :class="hasAchievement(selectedBadge.id) ? 'unlocked' : 'locked'">
              {{ hasAchievement(selectedBadge.id) ? 'UNLOCKED' : 'LOCKED' }}
            </div>
          </div>
          
          <div class="badge-detail-body glass-panel">
            <p class="badge-desc">{{ selectedBadge.description }}</p>
            <div class="badge-requirement">
              <span class="req-label">HOW TO ACHIEVE:</span>
              <p class="req-text">{{ getAchievementGuide(selectedBadge) }}</p>
            </div>
          </div>
          
          <ion-button expand="block" shape="round" color="primary" @click="isBadgeModalOpen = false" class="close-badge-btn">
            GOT IT!
          </ion-button>
        </div>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, IonIcon, IonSpinner, IonButton,
  IonTextarea, IonModal, toastController, alertController
} from '@ionic/vue';
import { 
  pencilOutline, trophyOutline, cameraOutline, flash, 
  closeOutline, personAddOutline, checkmarkCircleOutline,
  eyeOutline, chevronForwardOutline, alertCircleOutline,
  brushOutline
} from 'ionicons/icons';
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserService } from '@/services/UserService';
import { useStreakService } from '@/services/StreakService';
import { useMyDaysService } from '@/services/MyDaysService';
import { useHoneyService } from '@/services/HoneyService';
import BeeComposite from '@/components/BeeComposite.vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const route = useRoute();
const router = useRouter();
const { 
  getUserProfile, updateBio, userBeeId, getFriends, 
  sendFriendRequest, recordProfileVisit, getProfileVisits, reportUser 
} = useUserService();
const { getAllAchievements, getStreakWithFriend } = useStreakService();
const { fetchUserStories } = useMyDaysService();
const { honeyJars, consumeJar, isRevealed } = useHoneyService();

const beeId = computed(() => route.params.beeId as string);
const isMe = computed(() => beeId.value === userBeeId.value);

const friends = getFriends();
const isFriend = computed(() => {
    if (!beeId.value || !friends.value) return false;
    return friends.value.includes(beeId.value);
});

const isRequesting = ref(false);
const loading = ref(true);
const userProfile = ref<any>(null);
const userStories = ref<any[]>([]);
const isEditingBio = ref(false);
const tempBio = ref('');
const selectedStory = ref<any>(null);
const pairStreak = ref<any>(null);
const isVisitorsModalOpen = ref(false);
const visitors = ref<any[]>([]);
const revealedVisitors = ref(new Set<string>());
let visitorsUnsubscribe: (() => void) | null = null;

const selectedBadge = ref<any>(null);
const isBadgeModalOpen = ref(false);

const visitorProfiles = ref<Record<string, any>>({});
const displayedVisitors = computed(() => visitors.value.slice(0, 10));

const getVisitorCustomization = (id: string) => {
    return visitorProfiles.value[id] || { top: 'none', body: 'none', eyes: 'none' };
};

const isActuallyFriend = (id: string) => {
  return friends.value.includes(id) || isRevealed(id);
};

const revealVisitor = (id: string) => {
  revealedVisitors.value.add(id);
  Haptics.impact({ style: ImpactStyle.Light });
};

const handleRevealVisitor = async (id: string) => {
  if (honeyJars.value <= 0) {
    const toast = await toastController.create({
      message: 'You need 1 full Honey Jar to reveal Unknown Bees! 🍯',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
    return;
  }

  const success = await consumeJar(id);
  if (success) {
    revealedVisitors.value.add(id);
    Haptics.notification({ type: ImpactStyle.Heavy as any });
    
    const toast = await toastController.create({
      message: 'Unknown Bee revealed! 🏺✨',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
};

const allBadges = getAllAchievements();

const hasAchievement = (id: string) => {
  return (userProfile.value?.achievements || []).includes(id);
};

const startEditingBio = () => {
  tempBio.value = userProfile.value.bio || '';
  isEditingBio.value = true;
};

const saveBio = async () => {
  try {
    await updateBio(tempBio.value);
    userProfile.value.bio = tempBio.value;
    isEditingBio.value = false;
    
    const toast = await toastController.create({
      message: 'Bio updated! 🍯',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  } catch (e) {
    console.error(e);
  }
};

const openStory = (story: any) => {
  selectedStory.value = story;
};

const getTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

const handleRequestFriend = async () => {
    if (isRequesting.value || isFriend.value) return;
    
    try {
        isRequesting.value = true;
        await sendFriendRequest(beeId.value);
        Haptics.notification({ type: ImpactStyle.Heavy as any });
        
        const toast = await toastController.create({
            message: `Friend request sent to ${beeId.value}!`,
            duration: 2000,
            color: 'primary',
            position: 'top'
        });
        await toast.present();
    } catch (e) {
        console.error('Friend request failed:', e);
    } finally {
        isRequesting.value = false;
    }
};

const buzzBee = () => {
  // Navigate back to Hive with this bee selected
  router.push({ path: '/tabs/tab1', query: { buzz: beeId.value } });
};

const handleReportUser = async () => {
  const alert = await alertController.create({
    header: 'Report Bee',
    message: `Why are you reporting @${beeId.value}?`,
    inputs: [
      { name: 'reason', type: 'radio', label: 'Harassment', value: 'Harassment', checked: true },
      { name: 'reason', type: 'radio', label: 'Spam', value: 'Spam' },
      { name: 'reason', type: 'radio', label: 'Inappropriate Bio/Profile', value: 'Inappropriate Content' },
      { name: 'reason', type: 'radio', label: 'Impersonation', value: 'Impersonation' },
      { name: 'reason', type: 'radio', label: 'Hate Speech', value: 'Hate Speech' },
      { name: 'reason', type: 'radio', label: 'Other', value: 'Other' }
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Report',
        handler: async (reason) => {
          try {
            await reportUser(beeId.value, reason);
            const toast = await toastController.create({
              message: 'Report submitted. The Hive community stays safe because of bees like you! 🐝🛡️',
              duration: 3000,
              color: 'success',
              position: 'top'
            });
            await toast.present();
          } catch (e) {
            console.error('Report failed:', e);
          }
        }
      }
    ]
  });
  await alert.present();
};

const goToVisitorProfile = (visitorId: string) => {
  isVisitorsModalOpen.value = false;
  router.push(`/tabs/profile/${visitorId}`);
};

const showBadgeDetails = (badge: any) => {
  selectedBadge.value = badge;
  isBadgeModalOpen.value = true;
  Haptics.impact({ style: ImpactStyle.Light });
};

const getAchievementGuide = (badge: any) => {
  switch (badge.type) {
    case 'streak':
      return `Maintain a continuous daily conversation with a friend for at least ${badge.requirement} days.`;
    case 'buzzes':
      return `Send a total of ${badge.requirement} buzzes across the entire hive.`;
    case 'friends':
      return `Connect and add ${badge.requirement} bees to your colony.`;
    case 'special':
      if (badge.id === 'night_owl') return 'Send a buzz when most bees are sleeping (between 12 AM and 5 AM).';
      if (badge.id === 'early_bird') return 'Be the first to buzz when the sun rises (between 5 AM and 7 AM).';
      return badge.description;
    case 'jars':
      if (badge.id.startsWith('drops_')) return `Gather a lifetime total of ${badge.requirement.toLocaleString()} Honey Drops by interacting with Nectar!`;
      return `Fill and harvest ${badge.requirement} complete Honey Jars!`;
    default:
      return badge.description;
  }
};

onMounted(async () => {
    if (beeId.value === 'superadmin') {
        router.replace('/tabs/tab1');
        return;
    }
    try {
        const [profile, stories] = await Promise.all([
            getUserProfile(beeId.value),
            fetchUserStories(beeId.value)
        ]);
        
        userProfile.value = profile;
        userStories.value = stories;

        // Fetch pair streak if viewing another user's profile
        if (!isMe.value && userBeeId.value) {
            pairStreak.value = await getStreakWithFriend(userBeeId.value, beeId.value);
            // Record profile visit
            recordProfileVisit(beeId.value);
        }

        // Fetch visitors if viewing own profile
        if (isMe.value && userBeeId.value) {
            const { visits, unsubscribe } = getProfileVisits(userBeeId.value);
            visitorsUnsubscribe = unsubscribe;
            watch(visits, (newVisits) => {
              visitors.value = newVisits;
              
              if (newVisits.length > 0) {
                const ids = newVisits.map((v: any) => v.visitorId);
                const { members } = useUserService().getColonyMembers(ids);
                watch(members, (data) => {
                  data.forEach(m => {
                    visitorProfiles.value[m.beeId] = m.customization;
                  });
                }, { immediate: true });
              }
            }, { immediate: true });
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
});

onUnmounted(() => {
  if (visitorsUnsubscribe) visitorsUnsubscribe();
});
</script>

<style scoped>
.profile-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

ion-header {
  box-shadow: none;
  background: transparent;
}

ion-toolbar {
  --background: rgba(26, 26, 46, 0.6);
  --border-style: none;
  --color: white;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  text-align: center;
  padding: 40px;
}

.error-icon { font-size: 64px; }

.profile-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header Section */
.profile-header {
  padding: 30px 20px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.avatar-section {
  position: relative;
}

.profile-bee-stage {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 191, 0, 0.05);
  border-radius: 50%;
  border: 4px solid rgba(255, 191, 0, 0.2);
  box-shadow: 0 0 30px rgba(255, 191, 0, 0.2);
  animation: bee-entrance 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes bee-entrance {
  from { transform: scale(0.5) translateY(20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.online-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2dd36f;
  border: 3px solid #1a1a2e;
}

.identity-section h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.5px;
}

.identity-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.customize-profile-btn {
  margin: 0;
  padding: 0;
  --color: var(--ion-color-primary);
}

.bio-container {
  margin-top: 8px;
  width: 100%;
}

.bio-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin: 0 auto;
  max-width: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.edit-bio-btn {
  margin: 0;
  padding: 0;
  --color: var(--ion-color-primary);
}

.bio-edit-mode {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bio-input {
  --background: rgba(0,0,0,0.2);
  --color: white;
  --padding-start: 12px;
  --padding-end: 12px;
  --border-radius: 12px;
}

.bio-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Pair Streak Banner */
.pair-streak-banner {
  padding: 24px 20px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 191, 0, 0.1) 0%, rgba(255, 107, 0, 0.05) 100%);
  border: 2px solid rgba(255, 191, 0, 0.3);
  margin-top: 16px;
}

.pair-streak-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.pair-streak-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #ffbf00;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bee-emoji {
  font-size: 24px;
  animation: buzz-wiggle 2s ease-in-out infinite;
}

@keyframes buzz-wiggle {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.pair-stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 8px;
  margin-bottom: 16px;
}

.pair-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.pair-stat-icon {
  font-size: 32px;
  filter: drop-shadow(0 2px 8px rgba(255, 191, 0, 0.4));
}

.pair-stat-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.pair-stat-value {
  font-size: 24px;
  font-weight: 900;
  color: #ffbf00;
  text-shadow: 0 2px 10px rgba(255, 191, 0, 0.5);
}

.pair-stat-label {
  font-size: 8px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.8px;
  text-align: center;
}

.pair-stat-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, transparent, rgba(255, 191, 0, 0.3), transparent);
}

.streak-message {
  text-align: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 191, 0, 0.2);
}

.streak-message p {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: 12px;
}

.stat-card {
  flex: 1;
  padding: 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon { font-size: 24px; }

.stat-info { display: flex; flex-direction: column; }

.stat-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--ion-color-primary);
}

.stat-label {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.5px;
}

/* Section Common */
.section {
  margin-top: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12px;
}

.section-title ion-icon { color: var(--ion-color-primary); }

/* Stories Section */
.stories-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
}

.stories-scroll::-webkit-scrollbar { display: none; }

.story-card {
  flex-shrink: 0;
  width: 100px;
  height: 140px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.story-image-wrap { width: 100%; height: 100%; }
.story-img { width: 100%; height: 100%; object-fit: cover; }

.story-text-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  text-align: center;
}

.story-text-wrap p {
  font-size: 11px;
  font-weight: 700;
  color: #1a1a2e;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  line-clamp: 4;
}

.story-time {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px;
  background: rgba(0,0,0,0.5);
  color: white;
  font-size: 8px;
  text-align: center;
  font-weight: 600;
}

/* Achievements Grid */
.achievements-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 20px;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.badge-item.locked {
  opacity: 0.3;
  filter: grayscale(1);
}

.badge-icon {
  width: 54px;
  height: 54px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  position: relative;
}

.check-mark {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: #2dd36f;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 2px solid #1a1a2e;
}

.badge-name {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  line-height: 1.2;
}

.profile-meta-actions {
  margin-top: 10px;
}

/* Story Viewer */
.story-viewer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: black;
}

.viewer-img-container, .viewer-text-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-img-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.viewer-text-container {
  padding: 40px;
  text-align: center;
}

.viewer-text-container p {
  font-size: 32px;
  font-weight: 900;
  color: #1a1a2e;
}

.viewer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.viewer-header {
  padding: 40px 20px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
  pointer-events: auto;
}

.viewer-info { display: flex; flex-direction: column; }
.viewer-bee { font-weight: 800; color: white; }
.viewer-time { font-size: 12px; color: rgba(255,255,255,0.6); }

.viewer-caption {
  margin-top: auto;
  padding: 40px 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  color: white;
  font-size: 16px;
  line-height: 1.4;
}

/* Glass Panel Utility */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.gold-glow {
  box-shadow: 0 0 30px rgba(255, 191, 0, 0.2);
}

/* Visitors Section */
.visitors-list {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
}

.visitor-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.visitor-item:active {
  background: rgba(255, 255, 255, 0.1);
}

.visitor-avatar {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  position: relative;
}

.visitor-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.visitor-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.visitor-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.visitor-arrow-mini {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.3);
}

.view-all-visitors {
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
}

.view-all-visitors ion-button {
  --color: var(--ion-color-primary);
  font-weight: 700;
  font-size: 12px;
}

/* Visitors Modal */
.modal-container {
  height: 100%;
  background: var(--ion-background-color);
}

.full-visitors-list {
  display: flex;
  flex-direction: column;
}

.full-visitor-item {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.full-visitor-item .visitor-avatar {
  width: 44px;
  height: 44px;
  font-size: 22px;
}

.full-visitor-item .visitor-name {
  font-size: 16px;
}

.visitor-arrow {
  color: rgba(255, 255, 255, 0.2);
}

/* Badge Detail Modal Styles */
.badge-detail-modal {
  --height: auto;
  --border-radius: 32px 32px 0 0;
  --background: #1a1a2e;
}

.badge-info-container {
  padding: 30px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  background: linear-gradient(to bottom, #1a1a2e, #16213e);
  height: 100%;
}

.badge-detail-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.badge-detail-hex {
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  border-radius: 24px;
  border: 4px solid var(--ion-color-primary);
  box-shadow: 0 0 30px rgba(255, 191, 0, 0.3);
}

.badge-detail-hex.detail-locked {
  opacity: 0.4;
  filter: grayscale(1);
  border-color: #555;
}

.badge-detail-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
}

.status-chip {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
}

.status-chip.unlocked {
  background: rgba(45, 211, 111, 0.2);
  color: #2dd36f;
  border: 1px solid rgba(45, 211, 111, 0.3);
}

.status-chip.locked {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.badge-detail-body {
  width: 100%;
  padding: 20px;
  border-radius: 20px;
  text-align: center;
}

.badge-desc {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.badge-requirement {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 16px;
}

.req-label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  color: var(--ion-color-primary);
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.req-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.close-badge-btn {
  width: 100%;
  --padding-top: 16px;
  --padding-bottom: 16px;
  font-weight: 800;
}

/* New Visitor Trigger Card */
.view-trigger-card {
  display: flex;
  align-items: center;
  padding: 20px;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-trigger-card:active {
  background: rgba(255, 255, 255, 0.1);
}

.visitor-preview-avatars {
  display: flex;
  align-items: center;
}

.preview-hex {
  width: 32px;
  height: 32px;
  background: rgba(255, 191, 0, 0.1);
  border: 1px solid var(--ion-color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-right: -12px;
  box-shadow: 0 0 10px rgba(0,0,0,0.3);
}

.visitor-trigger-text {
  flex: 1;
}

.visitor-trigger-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
}

.visitor-trigger-text p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--ion-color-primary);
  font-weight: 600;
}

.is-blurred .blurred-text {
  filter: blur(5px);
  user-select: none;
  opacity: 0.7;
}

.visitor-action ion-button {
  --color: var(--ion-color-primary);
  font-weight: 800;
  font-size: 12px;
}

.profile-me-actions {
  width: 100%;
  margin-top: 5px;
}

.customize-btn-large {
  --border-radius: 12px;
  --background: var(--ion-color-primary);
  --color: black;
  font-weight: 800;
  height: 48px;
  --box-shadow: 0 4px 15px rgba(255, 191, 0, 0.2);
}
</style>
