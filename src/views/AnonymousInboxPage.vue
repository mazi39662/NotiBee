<template>
  <ion-page>
    <ion-content :fullscreen="true" class="anonymous-inbox-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Decorative Background Elements -->
      <div class="inbox-deco-blurs">
        <div class="blur-blob neon-pink"></div>
        <div class="blur-blob neon-blue"></div>
      </div>

      <div class="inbox-container">
        <!-- Header Section -->
        <div class="inbox-header animate-in">
          <div class="header-top">
            <div @click="router.back()" class="back-btn glass-btn">
              <ion-icon :icon="chevronBackOutline"></ion-icon>
            </div>
            <div class="header-actions">
              <button @click="navigateSetup" class="setup-link-btn glass-pill highlight-glow">
                <span>MY POST</span>
              </button>
              <button @click="handleDisableLink" class="disable-link-btn glass-pill">
                <span>DISABLE</span>
              </button>
            </div>
          </div>
          <div class="title-section">
            <h1 class="main-title">BuzzMe <span class="highlight">Inbox</span></h1>
            <p class="subtitle">Secret messages that vanish in 24 hours.</p>
          </div>
        </div>

        <!-- Scrollable Message Section -->
        <div class="content-scroll-area">
          <!-- Loading State -->
          <div v-if="isLoading" class="loading-state">
            <div class="scanner-wrap">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="scanner-bar"></div>
            </div>
            <p>Scanning the blurs...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="messages.length === 0" class="empty-state animate-in">
            <div class="empty-visual-new glass-panel">
              <div class="icon-orb">
                <ion-icon :icon="mailOutline"></ion-icon>
              </div>
              <div class="rings">
                <div class="ring r1"></div>
                <div class="ring r2"></div>
              </div>
            </div>
            <h2>Quiet in the Hive</h2>
            <p>Share your Buzz Link to start receiving secret messages!</p>
            <button @click="navigateSetup" class="setup-btn-premium vibrant-btn gold-glow">
              GET YOUR BUZZ LINK
            </button>
          </div>

          <!-- Message Grid -->
          <div v-else class="message-masonry">
            <div 
              v-for="(msg, index) in messages" 
              :key="msg.id" 
              class="buzz-card glass-panel animate-in"
              :style="{ 
                animationDelay: (index * 0.08) + 's',
                '--accent-color': msg.colorTheme 
              }"
              @click="openMessage(msg)"
            >
              <div class="buzz-card-glow" :style="{ background: msg.colorTheme }"></div>
              
              <div class="buzz-card-header">
                <div class="unread-dot" v-if="!msg.isRead" :style="{ background: msg.colorTheme }"></div>
                <div class="timer-tag">
                  <ion-icon :icon="timerOutline"></ion-icon>
                  <span>{{ getRemainingTime(msg.expiresAt) }}</span>
                </div>
              </div>

              <div class="buzz-card-body">
                <p class="content-text">{{ msg.content }}</p>
              </div>

              <div class="buzz-card-footer">
                <div class="accent-line" :style="{ background: msg.colorTheme }"></div>
                <div class="sent-time-tag">
                  {{ getSentTime(msg.timestamp) }}
                </div>
                <ion-icon :icon="chevronForwardOutline" class="arrow-icon"></ion-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Detail Modal -->
      <ion-modal 
        :is-open="!!selectedMessage" 
        @didDismiss="selectedMessage = null"
        class="message-detail-modal"
      >
        <div class="detail-wrapper" v-if="selectedMessage">
          <div class="detail-glass-card glass-panel" :style="{ '--modal-accent': selectedMessage.colorTheme }">
            <div class="modal-glow" :style="{ background: selectedMessage.colorTheme }"></div>
            
            <div class="detail-header-new">
              <div class="tag-row">
                <span class="detail-tag">BUZZME SECRET</span>
                <div class="status-chip" :style="{ background: selectedMessage.colorTheme + '22', color: selectedMessage.colorTheme }">
                  <ion-icon :icon="timerOutline"></ion-icon>
                  {{ getRemainingTime(selectedMessage.expiresAt) }}
                </div>
              </div>
              <div @click="selectedMessage = null" class="close-btn-glass">
                <ion-icon :icon="closeOutline"></ion-icon>
              </div>
            </div>
            
            <div class="detail-content-new">
              <div v-if="selectedMessage.invitePrompt" class="prompt-context glass-panel">
                <span class="prompt-label">Replied to:</span>
                <p class="prompt-text">"{{ selectedMessage.invitePrompt }}"</p>
              </div>
              <div class="message-reveal">
                <p class="main-message-text">{{ selectedMessage.content }}</p>
              </div>
            </div>

            <div class="detail-footer-new">
              <button @click="deleteMsg(selectedMessage.id)" class="delete-btn-glass">
                <ion-icon :icon="trashOutline"></ion-icon>
                <span>DELETE FOREVER</span>
              </button>
            </div>
          </div>

          <div class="detail-actions">
            <!-- Reaction Bar -->
            <div class="reaction-section-new animate-in" style="animation-delay: 0.1s">
              <p class="section-label" v-if="!selectedMessage.reaction">SEND A VIBE</p>
              <div 
                v-if="!selectedMessage.reaction" 
                class="reaction-bar-glass glass-panel"
                @touchstart="handleTouchStart"
                @touchmove="handleTouchMove"
                @touchend="handleTouchEnd"
              >
                <button 
                  v-for="(emoji, index) in emojiList" 
                  :key="emoji" 
                  @click="reactToMsg(selectedMessage, emoji)" 
                  class="react-btn-new"
                  :class="{ 'is-active': activeEmojiIndex === index }"
                  :data-index="index"
                >
                  {{ emoji }}
                </button>
              </div>
              <div v-else class="reaction-confirmation glass-panel">
                <span class="confirm-text">Vibe sent!</span>
                <span class="confirm-emoji">{{ selectedMessage.reaction }}</span>
              </div>
            </div>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonContent, IonIcon, IonSpinner, IonModal,
  toastController, alertController, IonRefresher, IonRefresherContent
} from '@ionic/vue';
import { 
  chevronBackOutline, mailOutline, timerOutline, 
  chevronForwardOutline, closeOutline, trashOutline, linkOutline
} from 'ionicons/icons';
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAnonymousService, AnonymousMessage } from '@/services/AnonymousService';
import { useMyDaysService } from '@/services/MyDaysService';
import { useUserService } from '@/services/UserService';

const router = useRouter();
const { messages, isLoading, fetchMessages, deleteMessage, sendReaction, clearInbox } = useAnonymousService();
const { disableAnonymousLink } = useMyDaysService();
const { updateAnonymousLinkExpiry } = useUserService();

const selectedMessage = ref<AnonymousMessage | null>(null);
const isReacting = ref(false);
const emojiList = ['❤️', '😂', '😬', '🤔', '😢'];
const activeEmojiIndex = ref(-1);

let unsubscribe: any = null;

onMounted(() => {
  unsubscribe = fetchMessages();
});

const handleRefresh = async (event: any) => {
  if (unsubscribe) unsubscribe();
  unsubscribe = fetchMessages();
  
  // Give it a small delay for better UX
  setTimeout(() => {
    event.target.complete();
    Haptics.impact({ style: ImpactStyle.Light });
  }, 800);
};

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const navigateSetup = () => {
  Haptics.impact({ style: ImpactStyle.Light });
  router.push('/tabs/anonymous-setup');
};

const handleDisableLink = async () => {
  const alert = await alertController.create({
    header: 'Deactivate Secret Link?',
    cssClass: 'danger-alert',
    message: 'This action is permanent and will perform the following:\n\n🚫 Disable your secret link\n🗑️ Remove invite from My Days\n💀 Wipe your entire inbox',
    buttons: [
      { 
        text: 'KEEP LINK', 
        role: 'cancel',
        cssClass: 'alert-button-cancel'
      },
      {
        text: 'DISABLE & CLEAR',
        role: 'destructive',
        cssClass: 'alert-button-confirm',
        handler: async () => {
          isLoading.value = true;
          try {
            await Promise.all([
              updateAnonymousLinkExpiry(null),
              disableAnonymousLink(),
              clearInbox()
            ]);
            
            Haptics.notification({ type: ImpactStyle.Heavy as any });
            
            const toast = await toastController.create({
              message: 'Link disabled and inbox cleared.',
              duration: 2500,
              color: 'warning',
              cssClass: 'notibee-toast'
            });
            await toast.present();
            router.back();
          } catch (err) {
            console.error('Error disabling link:', err);
          } finally {
            isLoading.value = false;
          }
        }
      }
    ]
  });
  await alert.present();
};

const openMessage = (msg: AnonymousMessage) => {
  Haptics.impact({ style: ImpactStyle.Medium });
  selectedMessage.value = msg;
};

const deleteMsg = async (id: string) => {
  const alert = await alertController.create({
    header: 'Delete Blur?',
    message: 'Once deleted, an anonymous message cannot be recovered.',
    buttons: [
      { text: 'CANCEL', role: 'cancel' },
      {
        text: 'DELETE',
        role: 'destructive',
        handler: async () => {
          await deleteMessage(id);
          selectedMessage.value = null;
          const toast = await toastController.create({
            message: 'Blur deleted forever.',
            duration: 1500,
            color: 'medium'
          });
          await toast.present();
        }
      }
    ]
  });
  await alert.present();
};

const getRemainingTime = (expiresAt: number) => {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const getSentTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const handleTouchStart = (e: TouchEvent) => {
  updateHoveredEmoji(e);
};

const handleTouchMove = (e: TouchEvent) => {
  updateHoveredEmoji(e);
};

const handleTouchEnd = () => {
  if (activeEmojiIndex.value !== -1 && selectedMessage.value) {
    reactToMsg(selectedMessage.value, emojiList[activeEmojiIndex.value]);
  }
  activeEmojiIndex.value = -1;
};

const updateHoveredEmoji = (e: TouchEvent) => {
  const touch = e.touches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const btn = el?.closest('.react-btn');
  if (btn) {
    const index = parseInt((btn as HTMLElement).dataset.index || '-1');
    if (activeEmojiIndex.value !== index) {
      activeEmojiIndex.value = index;
      Haptics.impact({ style: ImpactStyle.Light });
    }
  } else {
    activeEmojiIndex.value = -1;
  }
};

const reactToMsg = async (msg: AnonymousMessage, emoji: string) => {
  if (isReacting.value) return;
  
  isReacting.value = true;
  Haptics.impact({ style: ImpactStyle.Heavy });
  
  try {
    await sendReaction(msg, emoji);
    
    const toast = await toastController.create({
      message: `Reaction sent to anonymous sender! ${emoji}`,
      duration: 2000,
      color: 'warning',
      position: 'top',
      cssClass: 'notibee-toast'
    });
    await toast.present();
  } catch (err) {
    console.error('Error reacting:', err);
  } finally {
    isReacting.value = false;
  }
};
</script>

<style scoped>
.anonymous-inbox-content {
  --background: #050505;
}

.inbox-deco-blurs {
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

.blur-blob.neon-pink { background: #ffbf00; top: -100px; right: -100px; }
.blur-blob.neon-blue { background: #ff4d00; bottom: -100px; left: -100px; animation-delay: -15s; }

@keyframes blob-float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(150px, 150px) scale(1.3); }
}

.inbox-container {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  min-height: 100vh;
}

/* Header Redesign */
.inbox-header {
  margin-bottom: 40px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.glass-btn {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.glass-btn:active { transform: scale(0.9); }

.header-actions {
  display: flex;
  gap: 12px;
}

.glass-pill {
  height: 40px;
  padding: 0 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.highlight-glow {
  color: #ffbf00;
  border-color: rgba(255, 191, 0, 0.2);
  background: rgba(255, 191, 0, 0.05);
  box-shadow: 0 0 15px rgba(255, 191, 0, 0.1);
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

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 80px 0;
}

.scanner-wrap {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-bar {
  position: absolute;
  width: 100%;
  height: 2px;
  background: #ffbf00;
  box-shadow: 0 0 15px #ffbf00;
  animation: scan 1.5s infinite ease-in-out;
}

@keyframes scan {
  0%, 100% { transform: translateY(-30px); opacity: 0; }
  50% { transform: translateY(30px); opacity: 1; }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
}

.empty-visual-new {
  width: 140px;
  height: 140px;
  position: relative;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-orb {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: rgba(255, 255, 255, 0.2);
  z-index: 2;
}

.rings .ring {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255, 191, 0, 0.2);
  border-radius: 50%;
  animation: ring-pulse 4s infinite;
}

.r1 { width: 100px; height: 100px; }
.r2 { width: 140px; height: 140px; animation-delay: -2s !important; }

@keyframes ring-pulse {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  50% { opacity: 0.5; }
  100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
}

.setup-btn-premium {
  margin-top: 24px;
  height: 56px;
  padding: 0 32px;
  font-size: 14px;
}

/* Message Grid Redesign */
.message-masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.buzz-card {
  min-height: 180px;
  padding: 24px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.buzz-card:hover {
  transform: translateY(-8px) scale(1.02);
  background: rgba(255, 255, 255, 0.06);
}

.buzz-card-glow {
  position: absolute;
  top: -20%; right: -20%;
  width: 50%; height: 50%;
  filter: blur(40px);
  opacity: 0.08;
  border-radius: 50%;
  transition: opacity 0.4s;
}

.buzz-card:hover .buzz-card-glow {
  opacity: 0.15;
}

.buzz-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}

.timer-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.3);
}

.buzz-card-body {
  flex: 1;
}

.content-text {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.buzz-card-footer {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.accent-line {
  height: 3px;
  width: 30px;
  border-radius: 2px;
  opacity: 0.4;
}

.arrow-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}

.buzz-card:hover .arrow-icon {
  color: rgba(255, 255, 255, 0.4);
  transform: translateX(5px);
}

.sent-time-tag {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: 0.5px;
}

/* Modal Redesign */
.message-detail-modal {
  --background: rgba(0,0,0,0.9);
  --backdrop-opacity: 1;
}

.detail-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.detail-glass-card {
  width: 100%;
  max-width: 400px;
  border-radius: 40px;
  padding: 32px;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.7);
}

.modal-glow {
  position: absolute;
  top: -100px; left: -100px;
  width: 300px; height: 300px;
  filter: blur(80px);
  opacity: 0.1;
  pointer-events: none;
}

.detail-header-new {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.tag-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-tag {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.2);
}

.status-chip {
  width: fit-content;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}

.close-btn-glass {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.detail-content-new {
  margin-bottom: 40px;
  text-align: center;
}

.prompt-context {
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 20px;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.prompt-label {
  display: block;
  font-size: 9px;
  font-weight: 900;
  color: rgba(255, 191, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.prompt-text {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: rgba(255, 255, 255, 0.4) !important;
  margin: 0 !important;
  line-height: 1.4 !important;
}

.main-message-text {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.3;
  color: white;
  margin: 0;
  letter-spacing: -0.5px;
}

.detail-footer-new {
  display: flex;
  justify-content: center;
}

.delete-btn-glass {
  background: rgba(255, 68, 68, 0.05);
  border: 1px solid rgba(255, 68, 68, 0.1);
  color: #ff4444;
  padding: 12px 20px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.delete-btn-glass:active { background: rgba(255, 68, 68, 0.15); }

.detail-actions {
  margin-top: 30px;
  width: 100%;
  max-width: 400px;
}

.reaction-section-new {
  text-align: center;
}

.section-label {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 16px;
}

.reaction-bar-glass {
  display: flex;
  justify-content: center;
  gap: 14px;
  padding: 16px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.react-btn-new {
  font-size: 28px;
  background: transparent;
  border: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.react-btn-new.is-active {
  transform: scale(1.8) translateY(-12px);
}

.reaction-confirmation {
  padding: 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 800;
}

.confirm-emoji { font-size: 24px; }

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
  border-radius: 20px;
  font-weight: 900;
  transition: all 0.3s;
}

.vibrant-btn:active { transform: scale(0.96); }
</style>
