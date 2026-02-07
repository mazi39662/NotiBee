<template>
  <ion-page>
    <ion-content :fullscreen="true" class="setup-content">
      <div class="setup-deco-blurs">
        <div class="blur-blob purple"></div>
        <div class="blur-blob gold"></div>
      </div>

      <div class="setup-container">
        <!-- Header -->
        <div class="setup-header animate-in">
          <div @click="router.back()" class="back-btn glass-btn">
            <ion-icon :icon="chevronBackOutline"></ion-icon>
          </div>
          <div class="title-section">
            <h1 class="main-title"> <span class="highlight">BuzzMe</span></h1>
            <p class="subtitle">Let your friends send you secret messages.</p>
          </div>
        </div>

        <!-- Preview Card -->
        <div class="preview-card-outer animate-in" style="animation-delay: 0.1s">
          <div class="buzz-story-card glass-panel" :class="{ 'inactive': !isLinkActive }">
            <div class="buzz-card-accent" v-if="isLinkActive"></div>
            
            <div class="story-header">
              <div class="avatar-circle glass-panel">🐝</div>
              <div class="user-meta">
                <span class="user-id">@{{ userBeeId }}</span>
                <div class="live-badge" v-if="isLinkActive">
                  <div class="pulse-dot-small"></div>
                  SHARING LIVE
                </div>
                <span class="offline-tag" v-else>LAB OFFLINE</span>
              </div>
            </div>
            
            <div class="story-body">
              <div class="lock-icon-wrap" v-if="!isLinkActive">
                <ion-icon :icon="lockClosedOutline"></ion-icon>
              </div>
              <div class="editable-story-text" :class="{ 'locked': hasPosted }">
                <ion-textarea 
                  v-model="customMessage" 
                  auto-grow
                  :rows="1"
                  :maxlength="60"
                  class="card-input-premium"
                  :placeholder="hasPosted ? '' : 'Tap to write your secret invite...'"
                  inputmode="text"
                  :readonly="hasPosted"
                ></ion-textarea>
                <div v-if="hasPosted" class="live-indicator-tag">
                  <ion-icon :icon="checkmarkOutline"></ion-icon>
                  LIVE ON HIVE
                </div>
              </div>
              <div class="card-prompt-hint" v-if="isLinkActive">
                <span>Send Secret Message</span>
              </div>
            </div>

            <div class="story-footer">
              <span class="brand-tag">NOTIBEE LABS</span>
            </div>
          </div>
        </div>

        <!-- Session Status Box -->
        <div class="control-box glass-panel animate-in" style="animation-delay: 0.2s">
          <template v-if="isLinkActive">
            <div class="session-top">
              <span class="session-label">LIVE BUZZ SESSION</span>
              <div class="timer-pill glass-panel">
                <ion-icon :icon="timerOutline"></ion-icon>
                <span>{{ remainingSessionTime }}</span>
              </div>
            </div>
            <div class="session-info">
              <h3>Session Active!</h3>
              <p>Your custom link is now ready to receive blurs.</p>
              <button 
                @click="handlePostToHive" 
                class="premium-action-btn vibrant-btn" 
                :class="hasPosted ? 'success-btn' : 'gold-glow'"
                :disabled="isPosting || hasPosted"
              >
                <ion-spinner v-if="isPosting" name="crescent"></ion-spinner>
                <span v-else-if="hasPosted">POSTED TO HIVE! ✅</span>
                <span v-else>POST TO THE HIVE</span>
              </button>
            </div>
          </template>

          <template v-else>
            <div class="inactive-box">
              <div class="lab-orb glass-panel">
                <ion-icon :icon="flaskOutline"></ion-icon>
              </div>
              <h3>Start your session</h3>
              <p>Each session lasts 24 hours. Start yours to get your secret link!</p>
              <button 
                @click="generateLink" 
                class="premium-action-btn vibrancy-pulse gold-glow"
                :disabled="isGenerating || isLinkActive"
              >
                <ion-spinner v-if="isGenerating" name="crescent"></ion-spinner>
                <span v-else>START 24H LAB SESSION</span>
              </button>
            </div>
          </template>
        </div>

        <!-- Progress Steps -->
        <div class="steps-grid animate-in" style="animation-delay: 0.3s">
          <div class="step-card glass-panel">
            <div class="step-header">
              <span class="step-idx">01</span>
            </div>
            <p>Start your <strong>Lab Session</strong></p>
          </div>
          <div class="step-card glass-panel">
            <div class="step-header">
              <span class="step-idx">02</span>
            </div>
            <p><strong>Post</strong> to the Hive feed</p>
          </div>
          <div class="step-card glass-panel full-span">
            <div class="step-header">
              <span class="step-idx">03</span>
            </div>
            <p>Get ready for <strong>secret messages</strong> in BuzzMe Inbox!</p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="setup-footer animate-in" style="animation-delay: 0.4s">
          <button @click="router.push('/tabs/anonymous-inbox')" class="inbox-link-btn glass-pill">
            <ion-icon :icon="mailOutline"></ion-icon>
            OPEN BUZZME INBOX
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonContent, IonIcon, toastController, IonSpinner, IonTextarea
} from '@ionic/vue';
import { 
  chevronBackOutline, linkOutline, copyOutline, 
  checkmarkOutline, lockClosedOutline, timerOutline, flaskOutline,
  mailOutline
} from 'ionicons/icons';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useUserService } from '@/services/UserService';
import { useMyDaysService } from '@/services/MyDaysService';

const router = useRouter();
const { userBeeId, getUserProfile, updateAnonymousLinkExpiry } = useUserService();
const { createAnonymousStory } = useMyDaysService();

const isGenerating = ref(false);
const isPosting = ref(false);
const hasPosted = ref(false);
const customMessage = ref('Send me anonymous messages!');
const linkExpiry = ref<number | null>(null);
const currentTime = ref(Date.now());
let timerInterval: any = null;

const isLinkActive = computed(() => {
  if (!linkExpiry.value) return false;
  return linkExpiry.value > currentTime.value;
});

const remainingSessionTime = computed(() => {
  if (!linkExpiry.value) return '00:00:00';
  const diff = linkExpiry.value - currentTime.value;
  if (diff <= 0) return '00:00:00';
  
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
});

onMounted(async () => {
  if (userBeeId.value) {
    const profile = await getUserProfile(userBeeId.value);
    if (profile?.anonymousLinkExpiry) {
      linkExpiry.value = profile.anonymousLinkExpiry;
      
      // Check if already posted to My Days
      const { fetchUserStories } = useMyDaysService();
      const userStories = await fetchUserStories(userBeeId.value);
      const inviteStory = userStories.find(s => s.isAnonymousInvite);
      if (inviteStory) {
        hasPosted.value = true;
        // Sync the message from the actual story
        if (inviteStory.textContent) {
          customMessage.value = inviteStory.textContent.replace(' 🤫✨', '');
        }
      }
    }
  }

  timerInterval = setInterval(() => {
    currentTime.value = Date.now();
    if (linkExpiry.value && currentTime.value >= linkExpiry.value) {
      // Session just ended
      linkExpiry.value = null;
      hasPosted.value = false; // Reset post status when session dies
    }
  }, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

const generateLink = async () => {
  isGenerating.value = true;
  Haptics.impact({ style: ImpactStyle.Medium });
  
  const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  try {
    await updateAnonymousLinkExpiry(expiry);
    linkExpiry.value = expiry;
    
    const toast = await toastController.create({
      message: 'Buzz Lab Session Started! 🚀',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  } catch (err) {
    console.error('Error starting session:', err);
  } finally {
    isGenerating.value = false;
  }
};

const handlePostToHive = async () => {
  isPosting.value = true;
  try {
    await createAnonymousStory(customMessage.value);
    Haptics.impact({ style: ImpactStyle.Heavy });
    hasPosted.value = true;
    
    const toast = await toastController.create({
      message: 'Invite posted to Nectar! 🌸',
      duration: 2000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
    
    router.push('/tabs/my-days');
  } catch (err) {
    console.error('Error posting to hive:', err);
  } finally {
    isPosting.value = false;
  }
};

const shareToNectar = async () => {
  const toast = await toastController.create({
    message: 'Sharing to Hive coming soon!',
    duration: 2000,
    color: 'primary'
  });
  await toast.present();
};
</script>

<style scoped>
.setup-content {
  --background: #050505;
}

.setup-deco-blurs {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 0;
}

.blur-blob {
    position: absolute;
    width: 450px;
    height: 450px;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.12;
    animation: blob-float 30s infinite alternate ease-in-out;
}

.blur-blob.purple { background: #ffbf00; top: -100px; left: -100px; }
.blur-blob.gold { background: #ff4d00; bottom: -100px; right: -100px; animation-delay: -15s; }

@keyframes blob-float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(150px, 150px) scale(1.3); }
}

.setup-container {
  padding: 24px;
  max-width: 500px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Header */
.setup-header {
  margin-bottom: 30px;
}

.glass-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 24px;
}

.title-section {
  display: flex;
  flex-direction: column;
}

.main-title {
  font-size: 38px;
  font-weight: 900;
  letter-spacing: -1.5px;
  margin: 0;
  color: white;
}

.highlight {
  color: #ffbf00;
  background: linear-gradient(135deg, #ffbf00 0%, #ff4d00 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: rgba(255, 255, 255, 0.4);
  font-size: 15px;
  margin: 8px 0 0;
}

/* Preview Card Redesign */
.preview-card-outer {
  margin-bottom: 32px;
  perspective: 1200px;
}

.buzz-story-card {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  aspect-ratio: 9/15;
  border-radius: 40px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
  box-shadow: 0 40px 80px -20px rgba(0,0,0,0.6);
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.buzz-card-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 6px;
  background: linear-gradient(to right, #ffbf00, #ff4d00);
  opacity: 0.6;
}

.buzz-story-card.inactive {
  filter: grayscale(1);
  opacity: 0.4;
}

.story-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: rgba(255, 255, 255, 0.05);
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-id {
  font-weight: 800;
  font-size: 14px;
  color: white;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 950;
  color: #00ffaa;
  letter-spacing: 1px;
}

.pulse-dot-small {
  width: 6px; height: 6px;
  background: #00ffaa;
  border-radius: 50%;
  box-shadow: 0 0 10px #00ffaa;
  animation: dot-pulse 1.5s infinite;
}

@keyframes dot-pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

.offline-tag {
  font-size: 9px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: 1px;
}

.story-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.lock-icon-wrap {
  font-size: 40px;
  color: rgba(255, 255, 255, 0.05);
}

.card-input-premium {
  --color: white;
  --placeholder-color: rgba(255, 255, 255, 0.2);
  --padding-top: 0;
  font-size: 30px;
  font-weight: 900;
  text-align: center;
  line-height: 1.2;
}

.card-input-premium::part(native) {
  text-align: center;
}

.live-indicator-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 255, 170, 0.1);
  color: #00ffaa;
  border-radius: 30px;
  font-size: 10px;
  font-weight: 900;
  margin: 10px auto;
  border: 1px solid rgba(0, 255, 170, 0.1);
}

.card-prompt-hint {
  height: 44px;
  width: 100%;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 191, 0, 0.6);
  letter-spacing: 0.5px;
}

.brand-tag {
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 5px;
  color: rgba(255, 255, 255, 0.1);
  text-align: center;
  display: block;
}

/* Control Box */
.control-box {
  padding: 24px;
  border-radius: 32px;
  margin-bottom: 24px;
}

.session-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.session-label {
  font-size: 10px;
  font-weight: 950;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 2px;
}

.timer-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(255, 191, 0, 0.05);
  border: 1px solid rgba(255, 191, 0, 0.1);
  color: #ffbf00;
  font-weight: 900;
  font-size: 13px;
}

.session-info {
  text-align: center;
}

.session-info h3 { margin: 0 0 8px; font-weight: 900; font-size: 22px; }
.session-info p { margin: 0 0 24px; font-size: 14px; color: rgba(255, 255, 255, 0.4); }

.inactive-box {
  text-align: center;
}

.lab-orb {
  width: 64px; height: 64px;
  border-radius: 22px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #ffbf00;
  background: rgba(255, 191, 0, 0.05);
  border: 1px solid rgba(255, 191, 0, 0.1);
}

.inactive-box h3 { font-weight: 900; font-size: 24px; margin: 0 0 8px; }
.inactive-box p { font-size: 14px; color: rgba(255, 255, 255, 0.4); margin: 0 0 28px; line-height: 1.5; }

.premium-action-btn {
  width: 100%;
  height: 60px;
  border-radius: 20px;
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 0.5px;
}

.vibrancy-pulse {
  animation: vibrance 2.5s infinite;
}

@keyframes vibrance {
  0% { box-shadow: 0 0 0 0 rgba(255, 191, 0, 0.4); }
  70% { box-shadow: 0 0 30px 10px rgba(255, 191, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 191, 0, 0); }
}

.success-btn {
  background: #00ffaa;
  color: black;
  box-shadow: 0 10px 30px rgba(0, 255, 170, 0.2);
}

/* Steps Grid */
.steps-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 32px;
}

.step-card {
  padding: 20px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.full-span { grid-column: span 2; }

.step-header {
  width: 32px; height: 32px;
  border-radius: 10px;
  background: rgba(255, 191, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-idx {
  font-size: 11px;
  font-weight: 950;
  color: #ffbf00;
}

.step-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.5);
}

.step-card strong { color: white; }

/* Footer */
.setup-footer {
  padding-bottom: 40px;
}

.inbox-link-btn {
  width: 100%;
  height: 54px;
}

.glass-pill {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  color: white;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

/* Utilities */
.animate-in {
  animation: slideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  opacity: 0;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.gold-glow {
  background: #ffbf00;
  color: black;
  box-shadow: 0 10px 30px rgba(255, 191, 0, 0.3);
}

.vibrant-btn {
  transition: all 0.3s;
  border: none;
}

.vibrant-btn:active { transform: scale(0.96); }
</style>
