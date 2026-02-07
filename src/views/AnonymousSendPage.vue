<template>
  <ion-page>
    <ion-content :fullscreen="true" class="send-content">
      <!-- Dynamic Background Decor -->
      <div class="send-bg-decor">
        <div class="decor-blur p1" :style="{ background: currentThemeColor }"></div>
        <div class="decor-blur p2"></div>
        <div class="decor-blur p3" :style="{ background: currentThemeColor }"></div>
        <div class="floating-icons">
          <span class="float-emoji e1">🤫</span>
          <span class="float-emoji e2">✨</span>
          <span class="float-emoji e3">🐝</span>
          <span class="float-emoji e4">🌸</span>
        </div>
      </div>

      <div class="send-container">
        <div class="send-header animate-in">
          <button class="back-btn" @click="router.back()">
            <ion-icon :icon="chevronBackOutline"></ion-icon>
          </button>
          
          <div class="user-hero">
            <div class="avatar-ring" :style="{ borderColor: currentThemeColor }">
              <BeeComposite 
                :customization="targetCustomization" 
                :scale="0.32" 
                :animated="true"
              />
            </div>
            <div class="hero-text">
              <h1>Write to <span class="highlight" :style="{ color: currentThemeColor || '#ffbf00' }">@{{ beeId }}</span></h1>
              <p>They'll never know who buzzed... 🎭</p>
            </div>
          </div>
        </div>

        <div class="message-card-wrapper animate-in" style="animation-delay: 0.1s">
          <div 
            class="message-card glass-panel" 
            :style="{ 
              background: `linear-gradient(165deg, rgba(20,20,20,0.8) 0%, rgba(5,5,5,0.95) 100%)`,
              borderColor: `${currentThemeColor}33`
            }"
          >
            <!-- Theme Accent Bar -->
            <div class="theme-accent-bar" :style="{ background: currentThemeColor }"></div>
            
            <div class="card-top">
              <div class="lab-badge">
                <ion-icon :icon="flaskOutline"></ion-icon>
                <span>BUZZ LAB ANONYMOUS</span>
              </div>
            </div>
            
            <ion-textarea
              v-model="message"
              placeholder="Type your secret message here..."
              :rows="5"
              class="secret-input"
              :maxlength="200"
            ></ion-textarea>

            <div class="card-footer">
              <div class="safety-label">🔒 End-to-end encrypted</div>
              <div class="char-count" :class="{ 'warning': message.length > 180 }">
                <span>{{ message.length }}</span>/200
              </div>
            </div>
          </div>
        </div>

        <div class="theme-selector animate-in" style="animation-delay: 0.2s">
          <div class="selector-header">
            <p class="label">BEE VIBE</p>
            <span class="selected-theme-name" :style="{ color: currentThemeColor }">{{ currentThemeName }}</span>
          </div>
          <div class="themes">
            <div 
              v-for="theme in themes" 
              :key="theme.id"
              class="theme-dot-wrapper"
              :class="{ 'active': selectedTheme === theme.id }"
              @click="selectedTheme = theme.id"
            >
              <div class="theme-dot" :style="{ background: theme.color }"></div>
              <div class="dot-ring" :style="{ borderColor: theme.color }"></div>
            </div>
          </div>
        </div>

        <div class="send-actions animate-in" style="animation-delay: 0.3s">
          <button 
            @click="handleSend" 
            class="vibrant-btn primary-btn full-width"
            :class="{ 'btn-ready': message.trim().length > 0 }"
            :style="{ 
              background: currentThemeColor,
              boxShadow: message.trim().length > 0 ? `0 15px 40px -10px ${currentThemeColor}88` : 'none'
            }"
            :disabled="!message.trim() || isSending"
          >
            <ion-spinner v-if="isSending" name="crescent" color="dark"></ion-spinner>
            <div v-else class="btn-content">
              <span>SEND SECRET MESSAGE</span>
              <ion-icon :icon="flash"></ion-icon>
            </div>
          </button>
          <p class="safety-hint">Anonymous buzzing is for fun. Keep it sweet! 🌸</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonContent, IonIcon, IonTextarea, IonSpinner, toastController 
} from '@ionic/vue';
import { 
  chevronBackOutline, flaskOutline, flash 
} from 'ionicons/icons';
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAnonymousService } from '@/services/AnonymousService';
import { useUserService } from '@/services/UserService';
import { useHoneyService } from '@/services/HoneyService';
import { useMyDaysService } from '@/services/MyDaysService';
import BeeComposite from '@/components/BeeComposite.vue';

const route = useRoute();
const router = useRouter();
const beeId = route.params.beeId as string;

const message = ref('');
const isSending = ref(false);
const selectedTheme = ref('electric-gold');
const targetCustomization = ref<any>(null);
const currentInvitePrompt = ref<string | null>(null);

const { sendMessage } = useAnonymousService();
const { getUserProfile, userBeeId } = useUserService();

const themes = [
  { id: 'electric-gold', name: 'Classic Gold', color: '#ffbf00' },
  { id: 'royal-jelly', name: 'Royal Jelly', color: '#a855f7' },
  { id: 'nectar-rose', name: 'Nectar Rose', color: '#f43f5e' },
  { id: 'cyan-mist', name: 'Sky Buzz', color: '#06b6d4' },
  { id: 'forest-glow', name: 'Forest Hive', color: '#22c55e' }
];

const currentThemeColor = computed(() => {
  return themes.find(t => t.id === selectedTheme.value)?.color || '#ffbf00';
});

const currentThemeName = computed(() => {
  return themes.find(t => t.id === selectedTheme.value)?.name || 'Classic Gold';
});

onMounted(async () => {
  if (beeId) {
    const profile = await getUserProfile(beeId);
    if (profile?.customization) {
      targetCustomization.value = profile.customization;
    }

    // Fetch the active invite prompt
    const { fetchUserStories } = useMyDaysService();
    const userStories = await fetchUserStories(beeId);
    const inviteStory = userStories.find(s => s.isAnonymousInvite === true);
    if (inviteStory && inviteStory.textContent) {
      // Robust cleaning of signature emojis and extra spaces
      currentInvitePrompt.value = inviteStory.textContent
        .replace(/\s*[🤫✨]+\s*$/, '')
        .trim();
      
      console.log('Captured invite prompt:', currentInvitePrompt.value);
    }
  }
});

const handleSend = async () => {
  if (!message.value.trim() || isSending.value) return;
  
  isSending.value = true;
  try {
    await sendMessage(
      beeId, 
      message.value.trim(), 
      currentThemeColor.value, 
      userBeeId.value || undefined,
      currentInvitePrompt.value || undefined
    );
    
    // Reward honey drops if sending to someone else
    if (beeId !== userBeeId.value) {
      const { addBulkHoneyDrops } = useHoneyService();
      await addBulkHoneyDrops(5);
    }
    
    // Clear the message immediately
    message.value = '';
    
    Haptics.impact({ style: ImpactStyle.Heavy });
    
    const toast = await toastController.create({
      message: 'Secret message sent! 🤫🐝',
      duration: 2500,
      color: 'warning',
      position: 'top',
      cssClass: 'notibee-toast'
    });
    await toast.present();
    
    // Small delay before going back to let toast be seen
    setTimeout(() => {
      router.back();
    }, 1000);
  } catch (err) {
    console.error('Error sending message:', err);
    const toast = await toastController.create({
      message: 'Could not send message. Try again later.',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  } finally {
    isSending.value = false;
  }
};
</script>

<style scoped>
.send-content {
  --background: #050505;
}

/* Background Decor */
.send-bg-decor {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.decor-blur {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  transition: background 0.8s ease;
}

.p1 { top: -100px; left: -100px; }
.p2 { bottom: 10%; right: -150px; background: #ffbf00; opacity: 0.1; }
.p3 { top: 40%; left: 60%; width: 200px; height: 200px; }

.floating-icons {
  position: absolute;
  width: 100%;
  height: 100%;
}

.float-emoji {
  position: absolute;
  font-size: 24px;
  opacity: 0.2;
  animation: float-around 20s infinite linear;
}

.e1 { top: 15%; left: 10%; animation-duration: 15s; }
.e2 { top: 60%; left: 85%; animation-duration: 18s; animation-delay: -5s; }
.e3 { top: 80%; left: 15%; animation-duration: 22s; animation-delay: -2s; }
.e4 { top: 25%; left: 75%; animation-duration: 25s; animation-delay: -8s; }

@keyframes float-around {
  0% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, 50px) rotate(10deg); }
  66% { transform: translate(-20px, 20px) rotate(-10deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

/* Container */
.send-container {
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-height: 100%;
  position: relative;
  z-index: 1;
}

/* Header & Hero */
.send-header {
  margin-top: 10px;
}

.back-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  transition: all 0.2s;
}

.back-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.1);
}

.user-hero {
  display: flex;
  align-items: center;
  gap: 20px;
  text-align: left;
}

.avatar-ring {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  border: 4px solid;
  padding: 4px;
  transition: border-color 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-text h1 {
  font-size: 26px;
  font-weight: 900;
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}

.hero-text p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 0;
}

/* Message Card */
.message-card-wrapper {
  perspective: 1000px;
}

.message-card {
  border-radius: 30px;
  padding: 24px;
  border: 1px solid;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
  transition: border-color 0.5s ease;
}

.theme-accent-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 6px;
  opacity: 0.6;
  transition: background 0.5s ease;
}

.lab-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 900;
  color: #ffbf00;
  letter-spacing: 2px;
  background: rgba(255, 191, 0, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  margin-bottom: 24px;
  width: fit-content;
}

.secret-input {
  --background: transparent;
  --color: #fff;
  --placeholder-color: rgba(255, 255, 255, 0.2);
  --padding-start: 0;
  --padding-end: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 20px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.safety-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 600;
}

.char-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
  font-weight: 800;
}

.char-count span {
  color: #fff;
}

.char-count.warning {
  color: #f43f5e;
}

/* Theme Selector */
.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.label {
  font-size: 11px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 2px;
}

.selected-theme-name {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  color: #ffbf00;
}

.themes {
  display: flex;
  gap: 16px;
}

.theme-dot-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.theme-dot {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.dot-ring {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 15px;
  border: 2px solid;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.theme-dot-wrapper.active .theme-dot {
  transform: scale(0.85);
}

.theme-dot-wrapper.active .dot-ring {
  opacity: 1;
  transform: scale(1.1);
}

/* Actions */
.send-actions {
  margin-top: 10px;
  padding-bottom: 40px;
}

.vibrant-btn {
  width: 100%;
  height: 64px;
  padding: 0 16px;
  border-radius: 20px;
  font-weight: 900;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  color: black;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vibrant-btn:active {
  transform: scale(0.96);
}

.btn-ready {
  box-shadow: 0 15px 40px -10px currentColor;
}

.safety-hint {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 20px;
}

/* Animations */
.animate-in {
  animation: slideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
