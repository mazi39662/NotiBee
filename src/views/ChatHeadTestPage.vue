<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Test Chat Heads</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="test-container">
        <h2>🐝 Chat Head Test Page</h2>
        
        <!-- Platform Check -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Platform Support</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p><strong>Platform:</strong> {{ platform }}</p>
            <p><strong>Supported:</strong> {{ isSupported ? '✅ Yes' : '❌ No (Android only)' }}</p>
          </ion-card-content>
        </ion-card>

        <!-- Permission Status -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Permission Status</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p><strong>Overlay Permission:</strong> {{ hasPermission ? '✅ Granted' : '❌ Not Granted' }}</p>
            <ion-button 
              v-if="!hasPermission && isSupported" 
              expand="block" 
              @click="requestPermission"
              color="primary"
            >
              Request Permission
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Test Buttons -->
        <ion-card v-if="isSupported">
          <ion-card-header>
            <ion-card-title>Test Actions</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button 
              expand="block" 
              @click="showTestChatHead"
              :disabled="!hasPermission"
              color="success"
            >
              <ion-icon :icon="playCircle" slot="start"></ion-icon>
              Show Chat Head
            </ion-button>

            <ion-button 
              expand="block" 
              @click="hideChatHead"
              color="warning"
            >
              <ion-icon :icon="closeCircle" slot="start"></ion-icon>
              Hide Chat Head
            </ion-button>

            <ion-button 
              expand="block" 
              @click="updateChatHead"
              :disabled="!hasPermission"
              color="secondary"
            >
              <ion-icon :icon="refresh" slot="start"></ion-icon>
              Update Chat Head (Count: {{ testCount }})
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Instructions -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Instructions</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ol>
              <li>Grant overlay permission if not granted</li>
              <li>Click "Show Chat Head"</li>
              <li>You should see a floating bee avatar</li>
              <li>Try dragging it around</li>
              <li>Tap it to open the app</li>
            </ol>
          </ion-card-content>
        </ion-card>

        <!-- Logs -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Debug Log</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="log-container">
              <p v-for="(log, index) in logs" :key="index" class="log-entry">
                {{ log }}
              </p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, toastController
} from '@ionic/vue';
import { playCircle, closeCircle, refresh } from 'ionicons/icons';
import { ref, onMounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import { useChatHeadService } from '@/services/ChatHeadService';

const chatHeadService = useChatHeadService();

const platform = ref(Capacitor.getPlatform());
const isSupported = ref(false);
const hasPermission = ref(false);
const testCount = ref(1);
const logs = ref<string[]>([]);

function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.unshift(`[${timestamp}] ${message}`);
  if (logs.value.length > 10) {
    logs.value.pop();
  }
}

onMounted(async () => {
  addLog('Page loaded');
  
  isSupported.value = chatHeadService.isSupported();
  addLog(`Platform: ${platform.value}, Supported: ${isSupported.value}`);
  
  if (isSupported.value) {
    hasPermission.value = await chatHeadService.checkPermission();
    addLog(`Permission status: ${hasPermission.value}`);
  }
});

async function requestPermission() {
  addLog('Requesting overlay permission...');
  
  try {
    const granted = await chatHeadService.requestPermission();
    hasPermission.value = granted;
    
    addLog(`Permission ${granted ? 'granted' : 'denied'}`);
    
    const toast = await toastController.create({
      message: granted ? 'Permission granted!' : 'Permission denied. Please enable in Settings.',
      duration: 3000,
      color: granted ? 'success' : 'danger',
      position: 'top'
    });
    await toast.present();
  } catch (error) {
    addLog(`Error requesting permission: ${error}`);
  }
}

async function showTestChatHead() {
  addLog('Showing test chat head...');
  
  try {
    const success = await chatHeadService.showChatHead(
      'TEST_BEE_123',
      'Hey! This is a test message from NotiBee 🐝',
      {
        top: 'top-1',
        body: 'body-1',
        eyes: 'eye-1',
        accessories: ['acc-crown']
      },
      testCount.value
    );
    
    if (success) {
      addLog('✅ Chat head shown successfully!');
      addLog('Check your screen - you should see a floating bee!');
      
      const toast = await toastController.create({
        message: 'Chat head shown! Look for the floating bee 🐝',
        duration: 3000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } else {
      addLog('❌ Failed to show chat head');
      
      const toast = await toastController.create({
        message: 'Failed to show chat head. Check permissions.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  } catch (error) {
    addLog(`Error showing chat head: ${error}`);
  }
}

async function hideChatHead() {
  addLog('Hiding chat head...');
  
  try {
    await chatHeadService.hideChatHead();
    addLog('Chat head hidden');
    
    const toast = await toastController.create({
      message: 'Chat head hidden',
      duration: 2000,
      color: 'medium',
      position: 'top'
    });
    await toast.present();
  } catch (error) {
    addLog(`Error hiding chat head: ${error}`);
  }
}

async function updateChatHead() {
  testCount.value++;
  addLog(`Updating chat head (count: ${testCount.value})...`);
  
  try {
    await chatHeadService.updateChatHead(
      'TEST_BEE_123',
      `Updated message #${testCount.value}`,
      {
        top: 'top-1',
        body: 'body-1',
        eyes: 'eye-1'
      },
      testCount.value
    );
    
    addLog('Chat head updated');
  } catch (error) {
    addLog(`Error updating chat head: ${error}`);
  }
}
</script>

<style scoped>
.test-container {
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
  color: var(--ion-color-primary);
}

ion-card {
  margin-bottom: 16px;
}

ion-button {
  margin-top: 10px;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 10px;
}

.log-entry {
  font-family: monospace;
  font-size: 12px;
  margin: 4px 0;
  color: rgba(255, 255, 255, 0.8);
}

ol {
  padding-left: 20px;
}

ol li {
  margin-bottom: 8px;
  line-height: 1.5;
}
</style>
