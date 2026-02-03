<template>
  <ion-page>
    <ion-content :fullscreen="true" class="rejoin-hive-content">
      <div class="rejoin-wrapper">
        <div class="header-section">
          <div class="mini-avatar-hex animate-in">
            <div class="hexagon hex-glow">🐝</div>
          </div>
          <h1 class="animate-in" style="animation-delay: 0.1s">Rejoin the Hive</h1>
          <p class="animate-in" style="animation-delay: 0.2s">
            Enter your existing Bee ID and password to resume your flight.
          </p>
        </div>

        <div class="input-section animate-in" style="animation-delay: 0.3s">
          <div class="pro-input-container gold-glow-soft">
            <label class="pro-label">YOUR BEE ID</label>
            <ion-input 
              placeholder="e.g. HoneyKing" 
              v-model="beeId"
              class="pro-input"
              @keyup.enter="handleRejoin"
            ></ion-input>
          </div>

          <div class="pro-input-container gold-glow-soft mt-16">
            <label class="pro-label">PASSWORD</label>
            <div class="password-wrapper">
              <ion-input 
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••" 
                v-model="password"
                class="pro-input password-input"
                @keyup.enter="handleRejoin"
              ></ion-input>
              <ion-icon 
                :icon="showPassword ? eyeOff : eye" 
                class="eye-icon"
                @click="showPassword = !showPassword"
              ></ion-icon>
            </div>
          </div>

          <ion-button 
            expand="block" 
            color="primary" 
            @click="handleRejoin" 
            :disabled="!beeId || !password || isSaving"
            class="rejoin-btn"
          >
            <div v-if="!isSaving" class="btn-inner">
              <span>RESUME FLIGHT</span>
              <ion-icon :icon="flash"></ion-icon>
            </div>
            <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
          </ion-button>

          <p class="switch-link" @click="router.push('/create-id')">
            Wait, I need a <span>NEW Identity</span>
          </p>
        </div>
      </div>
      <HiveSplash :show="showSplash" status-text="Locating your honeycomb..." />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton, IonIcon, IonInput, IonSpinner, alertController } from '@ionic/vue';
import { flash, eye, eyeOff } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import { useUserService } from '@/services/UserService';
import { usePushService } from '@/services/PushService';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import HiveSplash from '@/components/HiveSplash.vue';

const router = useRouter();
const { saveUserProfile } = useUserService();
const { deviceToken } = usePushService();

const beeId = ref('');
const password = ref('');
const showPassword = ref(false);
const isSaving = ref(false);
const showSplash = ref(true);

onMounted(() => {
  setTimeout(() => showSplash.value = false, 1000);
});

const handleRejoin = async () => {
  if (!beeId.value || !password.value || isSaving.value) return;

  isSaving.value = true;
  showSplash.value = true;

  try {
    // isLogin = true for rejoining
    await saveUserProfile(beeId.value.trim(), deviceToken.value || null, true, password.value);
    Haptics.impact({ style: ImpactStyle.Heavy });
    router.replace('/tabs/tab1');
  } catch (e: any) {
    const alert = await alertController.create({
      header: 'Rejoin Failed',
      message: e.message || 'Incorrect ID or password. Please try again.',
      buttons: ['OK']
    });
    await alert.present();
    showSplash.value = false;
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.rejoin-hive-content {
  --background: #0a0a0a;
}

.rejoin-wrapper {
  padding: clamp(40px, 8vh, 80px) 24px;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: clamp(20px, 5vh, 40px);
  max-width: 500px;
  margin: 0 auto;
}

.header-section {
  text-align: center;
}

.mini-avatar-hex {
  width: 80px;
  height: 90px;
  margin: 0 auto 20px;
}

.hexagon {
  width: 100%;
  height: 100%;
  background: var(--ion-color-primary);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: #000;
}

.hex-glow {
  filter: drop-shadow(0 0 15px rgba(255, 191, 0, 0.6));
}

h1 {
  font-size: clamp(1.5rem, 6vw, 2.2rem);
  font-weight: 800;
  margin-bottom: 12px;
}

p {
  color: #777;
  font-size: clamp(0.9rem, 4vw, 1rem);
  line-height: 1.5;
}

.pro-input-container {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: clamp(16px, 5vw, 24px);
  display: flex;
  flex-direction: column;
  align-items: center;
  backdrop-filter: blur(15px);
  width: 100%;
}

.pro-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--ion-color-primary);
  letter-spacing: 2px;
  margin-bottom: 15px;
  text-transform: uppercase;
}

.pro-input {
  --color: #fff;
  font-size: clamp(1.5rem, 8vw, 2.5rem);
  font-weight: 800;
  text-align: center;
}

.pro-input::part(native) {
  text-align: center;
}

.gold-glow-soft {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.mt-16 { margin-top: 16px; }

.password-wrapper {
  position: relative;
  width: 100%;
}

.password-input {
  font-size: 24px !important;
}

.eye-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24px;
  color: var(--ion-color-primary);
  z-index: 10;
}

.rejoin-btn {
  --border-radius: 20px;
  height: clamp(56px, 12vw, 72px);
  font-weight: 900;
  font-size: clamp(1rem, 4vw, 1.2rem);
  margin-top: 24px;
  box-shadow: 0 8px 25px rgba(255, 191, 0, 0.2);
}

.btn-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
}

.switch-link span {
  color: #ffbf00;
  font-weight: 700;
  text-decoration: underline;
}

/* Animations */
.animate-in {
  opacity: 0;
  transform: translateY(20px);
  animation: slideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}
</style>
