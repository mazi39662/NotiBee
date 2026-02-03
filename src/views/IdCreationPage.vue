<template>
  <ion-page>
    <ion-content :fullscreen="true" class="id-creation-content">
      <div class="creation-wrapper">
        <div class="header-section">
          <div class="mini-avatar-hex animate-in">
            <div class="hexagon hex-glow">🐝</div>
          </div>
          <h1 class="animate-in" style="animation-delay: 0.1s">
            {{ isLogin ? 'Rejoin the Hive' : 'Choose your Bee ID' }}
          </h1>
          <p class="animate-in" style="animation-delay: 0.2s">
            {{ isLogin ? 'Enter your existing Bee ID to resume flight.' : 'This is how other bees will find you in the Hive. Choose wisely!' }}
          </p>
        </div>

        <div class="input-section animate-in" style="animation-delay: 0.3s">
          <div class="pro-input-container gold-glow-soft">
            <label class="pro-label">{{ isLogin ? 'YOUR BEE ID' : 'SET YOUR BEE ID' }}</label>
            <ion-input 
              placeholder="e.g. HoneyKing" 
              v-model="beeId"
              class="pro-input"
              @keyup.enter="handleCreate"
            ></ion-input>
          </div>

          <div class="pro-input-container gold-glow-soft mt-16">
            <label class="pro-label">{{ isLogin ? 'ENTER PASSWORD' : 'SET A PASSWORD' }}</label>
            <div class="password-wrapper">
              <ion-input 
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••" 
                v-model="password"
                class="pro-input password-input"
                @keyup.enter="handleCreate"
              ></ion-input>
              <ion-icon 
                :icon="showPassword ? eyeOff : eye" 
                class="eye-icon"
                @click="showPassword = !showPassword"
              ></ion-icon>
            </div>
          </div>

          <div v-if="!isLogin" class="pro-input-container gold-glow-soft mt-16">
            <label class="pro-label">CONFIRM PASSWORD</label>
            <div class="password-wrapper">
              <ion-input 
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="••••••••" 
                v-model="confirmPassword"
                class="pro-input password-input"
                @keyup.enter="handleCreate"
              ></ion-input>
              <ion-icon 
                :icon="showConfirmPassword ? eyeOff : eye" 
                class="eye-icon"
                @click="showConfirmPassword = !showConfirmPassword"
              ></ion-icon>
            </div>
          </div>
          
          <p class="input-footer">Letters and numbers only. No spaces.</p>

          <ion-button 
            expand="block" 
            color="primary" 
            @click="handleCreate" 
            :disabled="!beeId || isSaving"
            class="create-btn"
          >
            <div v-if="!isSaving" class="btn-inner">
              <span>{{ isLogin ? 'REJOIN HIVE' : 'ENTER THE HIVE' }}</span>
              <ion-icon :icon="flash"></ion-icon>
            </div>
            <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
          </ion-button>

          <p class="login-link animate-in" style="animation-delay: 0.5s">
            <span v-if="!isLogin" @click="isLogin = true">I already have a Bee ID</span>
            <span v-else @click="isLogin = false">I want a NEW identity</span>
          </p>
        </div>
      </div>
      <HiveSplash :show="showSplash" status-text="Validating Bee ID..." />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton, IonIcon, IonInput, IonItem, IonSpinner, alertController } from '@ionic/vue';
import { atOutline, flash, eye, eyeOff } from 'ionicons/icons';
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
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isSaving = ref(false);
const showSplash = ref(true);
const isLogin = ref(false);

onMounted(() => {
  setTimeout(() => showSplash.value = false, 1000);
});

const handleCreate = async () => {
  if (!beeId.value || !password.value || isSaving.value) return;
  if (!isLogin.value && !confirmPassword.value) return;

  if (!isLogin.value && password.value !== confirmPassword.value) {
    const alert = await alertController.create({
      header: 'Mismatch',
      message: 'Passwords do not match.',
      buttons: ['Try Again']
    });
    await alert.present();
    return;
  }

  // Simple validation
  const cleanId = beeId.value.trim();
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(cleanId)) {
    const alert = await alertController.create({
      header: 'Invalid ID',
      message: 'Bee ID must be 3-15 characters and contain only letters, numbers, or underscores.',
      buttons: ['Try Again']
    });
    await alert.present();
    return;
  }

  if (password.value.length < 4) {
    const alert = await alertController.create({
      header: 'Weak Password',
      message: 'Password must be at least 4 characters long.',
      buttons: ['Try Again']
    });
    await alert.present();
    return;
  }

  isSaving.value = true;
  showSplash.value = true;

  try {
    await saveUserProfile(cleanId, deviceToken.value || null, isLogin.value, password.value);
    Haptics.impact({ style: ImpactStyle.Heavy });
    router.replace('/tabs/tab1');
  } catch (e: any) {
    const header = isLogin.value ? 'Login Failed' : 'ID Taken';
    const alert = await alertController.create({
      header: header,
      message: e.message || 'Error processing your request.',
      buttons: ['Try Again']
    });
    await alert.present();
    showSplash.value = false;
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.id-creation-content {
  --background: var(--ion-background-color);
}

.creation-wrapper {
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
  color: black;
}

.hex-glow {
  filter: drop-shadow(0 0 15px rgba(255, 191, 0, 0.6));
}

h1 {
  font-size: clamp(1.5rem, 6vw, 2.2rem);
  font-weight: 800;
  color: var(--ion-text-color);
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
  opacity: 0.9;
}

.pro-input {
  --color: var(--ion-text-color);
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 1;
  font-size: clamp(1.5rem, 8vw, 2.5rem);
  font-weight: 800;
  text-align: center;
  width: 100%;
  margin: 0;
}

.pro-input::part(native) {
  text-align: center;
  padding: 0;
}

.gold-glow-soft {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 191, 0, 0.05);
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mt-16 {
  margin-top: 0px;
}

.password-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.password-input {
  font-size: 24px !important;
}

.eye-icon {
  position: absolute;
  right: 0;
  font-size: 24px;
  color: var(--ion-color-primary);
  cursor: pointer;
  padding: 10px;
  z-index: 10;
}

.input-footer {
  font-size: 13px;
  color: var(--ion-color-medium);
  text-align: center;
  margin-top: -5px;
}

.create-btn {
  --border-radius: 20px;
  --background: var(--ion-color-primary);
  --color: black;
  height: clamp(56px, 12vw, 72px);
  font-weight: 900;
  font-size: clamp(1rem, 4vw, 1.2rem);
  margin-top: 10px;
  box-shadow: 0 8px 25px rgba(255, 191, 0, 0.2);
}

.login-link {
  text-align: center;
  color: var(--ion-color-medium);
  font-size: 14px;
  margin-top: 10px;
}

.login-link span {
  color: var(--ion-color-primary);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 4px;
}

/* Animations */
.animate-in {
  opacity: 0;
  transform: translateY(20px);
  animation: slideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
