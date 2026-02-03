<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab3"></ion-back-button>
        </ion-buttons>
        <ion-title>Chat Head Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="settings-content">
      <div class="settings-container">
        
        <!-- Platform Support Notice -->
        <div v-if="!chatHeadService.isSupported()" class="notice-card glass-panel">
          <ion-icon :icon="informationCircleOutline" color="warning"></ion-icon>
          <div class="notice-content">
            <h3>Not Available</h3>
            <p>Chat heads are only available on Android devices.</p>
          </div>
        </div>

        <!-- Settings List -->
        <div v-else class="settings-list">
          
          <!-- Enable Chat Heads -->
          <div class="setting-item glass-panel">
            <div class="setting-info">
              <h3>Enable Chat Heads</h3>
              <p>Show floating bee avatars when you receive messages</p>
            </div>
            <ion-toggle 
              v-model="chatHeadEnabled" 
              @ionChange="handleToggleChatHeads"
              :disabled="!hasPermission && !chatHeadEnabled"
            ></ion-toggle>
          </div>

          <!-- Permission Status -->
          <div v-if="!hasPermission" class="setting-item glass-panel warning">
            <div class="setting-info">
              <ion-icon :icon="alertCircleOutline" color="warning"></ion-icon>
              <div>
                <h3>Permission Required</h3>
                <p>Grant overlay permission to enable chat heads</p>
              </div>
            </div>
            <ion-button 
              fill="solid" 
              color="primary" 
              @click="requestPermission"
              size="small"
            >
              Grant Permission
            </ion-button>
          </div>

          <!-- Permission Granted -->
          <div v-else class="setting-item glass-panel success">
            <div class="setting-info">
              <ion-icon :icon="checkmarkCircleOutline" color="success"></ion-icon>
              <div>
                <h3>Permission Granted</h3>
                <p>Chat heads can display over other apps</p>
              </div>
            </div>
          </div>

          <!-- Test Chat Head -->
          <div class="setting-item glass-panel">
            <div class="setting-info">
              <h3>Test Chat Head</h3>
              <p>See how chat heads look with your bee avatar</p>
            </div>
            <ion-button 
              fill="outline" 
              color="primary" 
              @click="testChatHead"
              :disabled="!chatHeadEnabled || !hasPermission"
              size="small"
            >
              <ion-icon :icon="playCircleOutline" slot="start"></ion-icon>
              Test
            </ion-button>
          </div>

          <!-- How It Works -->
          <div class="info-section glass-panel">
            <h3>
              <ion-icon :icon="helpCircleOutline"></ion-icon>
              How Chat Heads Work
            </h3>
            <ul>
              <li>When you receive a message, a floating bee avatar appears</li>
              <li>Tap the bee to open the conversation</li>
              <li>Drag the bee to move it around your screen</li>
              <li>The bee shows your friend's custom avatar</li>
              <li>Unread count badge shows number of new messages</li>
            </ul>
          </div>

          <!-- Privacy Notice -->
          <div class="info-section glass-panel">
            <h3>
              <ion-icon :icon="shieldCheckmarkOutline"></ion-icon>
              Privacy & Battery
            </h3>
            <ul>
              <li>Chat heads only show when the app is in the background</li>
              <li>No message content is stored by the chat head service</li>
              <li>Minimal battery impact (uses foreground service)</li>
              <li>You can disable chat heads anytime</li>
            </ul>
          </div>

        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonToggle, IonButton, IonIcon,
  alertController, toastController
} from '@ionic/vue';
import {
  informationCircleOutline, alertCircleOutline, checkmarkCircleOutline,
  playCircleOutline, helpCircleOutline, shieldCheckmarkOutline
} from 'ionicons/icons';
import { ref, onMounted } from 'vue';
import { useChatHeadService } from '@/services/ChatHeadService';
import { useUserService } from '@/services/UserService';

const chatHeadService = useChatHeadService();
const { userBeeId } = useUserService();

const chatHeadEnabled = ref(false);
const hasPermission = ref(false);

onMounted(async () => {
  // Check current permission status
  hasPermission.value = await chatHeadService.checkPermission();
  
  // Load saved preference
  const saved = localStorage.getItem('chatHeadEnabled');
  chatHeadEnabled.value = saved === 'true' && hasPermission.value;
});

async function handleToggleChatHeads(event: any) {
  const enabled = event.detail.checked;
  
  if (enabled) {
    // Check permission first
    if (!hasPermission.value) {
      const granted = await requestPermission();
      if (!granted) {
        chatHeadEnabled.value = false;
        return;
      }
    }
    
    // Save preference
    localStorage.setItem('chatHeadEnabled', 'true');
    
    const toast = await toastController.create({
      message: 'Chat heads enabled! You\'ll see floating bees when you get messages.',
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  } else {
    // Disable and remove all chat heads
    localStorage.setItem('chatHeadEnabled', 'false');
    await chatHeadService.removeAllChatHeads();
    
    const toast = await toastController.create({
      message: 'Chat heads disabled',
      duration: 2000,
      color: 'medium',
      position: 'top'
    });
    await toast.present();
  }
}

async function requestPermission(): Promise<boolean> {
  const granted = await chatHeadService.requestPermission();
  
  if (granted) {
    hasPermission.value = true;
    
    const toast = await toastController.create({
      message: 'Permission granted! Chat heads are ready.',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
    
    return true;
  } else {
    // Show instructions
    const alert = await alertController.create({
      header: 'Enable Overlay Permission',
      message: 'To use chat heads, please enable "Display over other apps" permission in your device settings.\n\nSettings > Apps > NotiBee > Display over other apps',
      buttons: ['OK']
    });
    await alert.present();
    
    return false;
  }
}

async function testChatHead() {
  if (!chatHeadEnabled.value || !hasPermission.value) return;
  
  // Get user's own bee customization
  const customization = {
    top: 'top-1',
    body: 'body-1',
    eyes: 'eye-1',
    accessories: ['acc-crown']
  };
  
  const success = await chatHeadService.showChatHead(
    userBeeId.value || 'TEST_BEE',
    'This is how chat heads look! Tap to open, drag to move. 🐝',
    customization,
    3
  );
  
  if (success) {
    const toast = await toastController.create({
      message: 'Test chat head shown! Check your screen.',
      duration: 3000,
      color: 'primary',
      position: 'bottom'
    });
    await toast.present();
  } else {
    const toast = await toastController.create({
      message: 'Failed to show chat head. Please check permissions.',
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}
</script>

<style scoped>
.settings-content {
  --background: var(--ion-background-color);
}

.settings-container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.notice-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 20px;
  background: rgba(255, 191, 0, 0.1);
  border: 1px solid rgba(255, 191, 0, 0.3);
}

.notice-card ion-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.notice-content h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--ion-color-warning);
}

.notice-content p {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.setting-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.setting-item.warning {
  background: rgba(255, 193, 7, 0.1);
  border-color: rgba(255, 193, 7, 0.3);
}

.setting-item.success {
  background: rgba(45, 211, 111, 0.1);
  border-color: rgba(45, 211, 111, 0.3);
}

.setting-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-info h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 700;
  color: white;
}

.setting-info p {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.setting-info ion-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-section {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-section h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--ion-color-primary);
}

.info-section h3 ion-icon {
  font-size: 20px;
}

.info-section ul {
  margin: 0;
  padding-left: 20px;
}

.info-section li {
  margin-bottom: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}

.info-section li:last-child {
  margin-bottom: 0;
}

ion-toggle {
  --handle-width: 24px;
  --handle-height: 24px;
}
</style>
