<template>
  <ion-page>
    <ion-content :fullscreen="true" class="onboarding-content">
      <div v-if="step < 4" class="skip-btn-container animate-fade">
        <ion-button fill="clear" color="medium" @click="skipOnboarding">SKIP</ion-button>
      </div>

      <div class="onboarding-wrapper">
        <!-- Step 1: Welcome -->
        <div v-if="step === 1" class="step-container animate-slide">
          <div class="hero-section">
            <div class="large-avatar-hex hex-glow">
              <div class="hexagon">🐝</div>
            </div>
            <h1>Welcome to the Hive</h1>
            <p>Experience a new way to stay connected with your swarm in real-time.</p>
          </div>
          <div class="step-image">
            <div class="illustration glass-panel">
              <div class="bee-path"></div>
              <span class="emoji-large">🍯</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Instant Buzzes -->
        <div v-if="step === 2" class="step-container animate-slide">
          <div class="hero-section">
            <div class="icon-circle gold-glow">
              <ion-icon :icon="flash"></ion-icon>
            </div>
            <h1>Flash Buzzes</h1>
            <p>Send instant notifications that pop up right on your friend's screens. No more missed messages.</p>
          </div>
          <div class="step-features">
            <div class="feature-msg glass-panel">"Hey! Look at this! ⚡"</div>
            <div class="feature-msg glass-panel received">"BZZZT! I'm here! 🙌"</div>
          </div>
        </div>

        <!-- Step 3: Real-time Radar -->
        <div v-if="step === 3" class="step-container animate-slide">
          <div class="hero-section">
            <div class="icon-circle silver-glow">
              <ion-icon :icon="locationOutline"></ion-icon>
            </div>
            <h1>Colony Radar</h1>
            <p>See who's active and where they are. Drag and play with your friends in the dynamic live hive.</p>
          </div>
          <div class="radar-preview">
            <div class="radar-ring"></div>
            <div class="radar-ring delay-1"></div>
            <div class="radar-bee">🐝</div>
          </div>
        </div>

        <!-- Step 4: Legal & Choice -->
        <div v-if="step === 4" class="step-container animate-slide">
          <div class="hero-section">
            <div class="icon-circle lock-glow">
              <ion-icon :icon="shieldCheckmarkOutline"></ion-icon>
            </div>
            <h1>Join the Swarm</h1>
            <p>Before we start, please review our hive rules and privacy policy.</p>
          </div>
          
          <div class="legal-box glass-panel">
            <ion-item lines="none" class="legal-toggle">
              <ion-checkbox slot="start" v-model="agreedToTerms"></ion-checkbox>
              <ion-label>
                I agree to the <span class="link" @click.stop="viewLegal('terms')">Terms & Conditions</span> and <span class="link" @click.stop="viewLegal('privacy')">Privacy Policy</span>.
              </ion-label>
            </ion-item>
          </div>

          <div class="choice-actions">
            <ion-button expand="block" color="primary" :disabled="!agreedToTerms" @click="goToCreate" class="action-btn">
              CREATE NEW IDENTITY
              <ion-icon :icon="addCircleOutline" slot="end"></ion-icon>
            </ion-button>
            <div class="divider">OR</div>
            <ion-button expand="block" fill="outline" color="secondary" :disabled="!agreedToTerms" @click="handleGoogleLogin" class="action-btn google-btn">
              CONTINUE WITH GOOGLE
              <ion-icon :icon="logoGoogle" slot="end"></ion-icon>
            </ion-button>
            <div class="divider">OR</div>
            <ion-button expand="block" fill="clear" color="medium" :disabled="!agreedToTerms" @click="goToLogin" class="action-btn">
              CLAIM EXISTING ID
              <ion-icon :icon="logInOutline" slot="end"></ion-icon>
            </ion-button>
          </div>
        </div>

        <!-- Footer Navigation -->
        <div class="onboarding-footer" v-if="step < 4">
          <div class="step-dots">
            <div v-for="i in 3" :key="i" :class="['dot', { active: step === i }]"></div>
          </div>
          <ion-button expand="block" color="primary" @click="nextStep" class="next-btn">
            {{ step === 3 ? 'CONTINUE' : 'NEXT' }}
            <ion-icon :icon="arrowForward" slot="end"></ion-icon>
          </ion-button>
        </div>
      </div>
      
      <HiveSplash :show="showSplash" status-text="Polishing the honeycomb..." />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonContent, IonButton, IonIcon, 
  IonCheckbox, IonItem, IonLabel 
} from '@ionic/vue';
import { 
  arrowForward, flash, locationOutline, 
  shieldCheckmarkOutline, addCircleOutline, logInOutline, logoGoogle 
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import HiveSplash from '@/components/HiveSplash.vue';
import { useUserService } from '@/services/UserService';
import { alertController } from '@ionic/vue';

const router = useRouter();
const showSplash = ref(true);
const step = ref(1);
const agreedToTerms = ref(false);

onMounted(() => {
  setTimeout(() => showSplash.value = false, 1500);
});

const nextStep = () => {
  Haptics.impact({ style: ImpactStyle.Light });
  step.value++;
};

const skipOnboarding = () => {
  Haptics.impact({ style: ImpactStyle.Medium });
  step.value = 4;
};

const viewLegal = (tab: string) => {
  router.push(`/legal?tab=${tab}`);
};

const goToCreate = () => {
  router.push('/create-id');
};

const goToLogin = () => {
  router.push('/rejoin-hive'); 
};

const { googleLogin } = useUserService();

const handleGoogleLogin = async () => {
  Haptics.impact({ style: ImpactStyle.Heavy });
  showSplash.value = true;
  try {
    const result = await googleLogin();
    if (result.newUser) {
      // Pass the suggested beeId or email to create account
      router.push({
        path: '/create-id',
        query: { 
          email: result.email, 
          suggestedId: result.displayName?.replace(/\s+/g, '').toLowerCase(),
          isGoogle: 'true'
        }
      });
    } else {
      router.replace('/tabs/tab1');
    }
  } catch (error: any) {
    const alert = await alertController.create({
      header: 'Google Login Error',
      message: error.message || 'Could not sign in with Google.',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    showSplash.value = false;
  }
};
</script>

<style scoped>
.onboarding-content {
  --background: #0a0a0a;
}

.skip-btn-container {
  position: absolute;
  top: env(safe-area-inset-top);
  right: 10px;
  z-index: 100;
}

.onboarding-wrapper {
  padding: clamp(40px, 10vh, 80px) 24px 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  max-width: 500px;
  margin: 0 auto;
}

.step-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.hero-section {
  margin-bottom: 40px;
}

.large-avatar-hex {
  width: 100px;
  height: 110px;
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
  font-size: 50px;
  color: #000;
}

.icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 191, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #ffbf00;
  margin: 0 auto 20px;
  border: 1px solid rgba(255, 191, 0, 0.3);
}

h1 {
  font-size: clamp(1.5rem, 7vw, 2.2rem);
  font-weight: 800;
  margin-bottom: 12px;
}

p {
  color: #888;
  font-size: clamp(0.9rem, 4vw, 1.1rem);
  line-height: 1.5;
  max-width: 320px;
  margin: 0 auto;
}

/* Visualization Styles */
.step-image, .step-features, .radar-preview {
  width: 100%;
  height: clamp(160px, 30vh, 240px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 20px 0;
}

.illustration {
  width: 160px;
  height: 160px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
}

.emoji-large { font-size: 60px; }

.feature-msg {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  border-radius: 15px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.feature-msg.received {
  border-color: #ffbf00;
  background: rgba(255, 191, 0, 0.1);
  align-self: flex-end;
}

.radar-preview {
  position: relative;
}

.radar-ring {
  position: absolute;
  width: 100px;
  height: 100px;
  border: 1px solid #ffbf00;
  border-radius: 50%;
  animation: radar-pulse 2s infinite;
}

.radar-ring.delay-1 { animation-delay: 1s; }

.radar-bee { font-size: 40px; z-index: 2; }

@keyframes radar-pulse {
  from { transform: scale(0.5); opacity: 1; }
  to { transform: scale(2); opacity: 0; }
}

/* Legal & Actions */
.legal-box {
  margin-top: 20px;
  width: 100%;
}

.legal-toggle {
  --background: transparent;
  --padding-start: 10px;
}

.legal-toggle ion-label {
  font-size: 12px;
  color: #888;
  white-space: normal;
}

.link {
  color: #ffbf00;
  text-decoration: underline;
  cursor: pointer;
}

.choice-actions {
  width: 100%;
  margin-top: 24px;
}

.action-btn {
  --border-radius: 16px;
  height: clamp(50px, 12vw, 56px);
  font-weight: 800;
  font-size: clamp(0.8rem, 3.5vw, 0.9rem);
  margin-bottom: 8px;
}

.google-btn {
  --border-color: #4285F4;
  --color: #4285F4;
}

.divider {
  margin: 12px 0;
  font-size: 10px;
  font-weight: 900;
  color: #444;
  letter-spacing: 2px;
}

.onboarding-footer {
  margin-top: auto;
  width: 100%;
}

.step-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #333;
  transition: all 0.3s ease;
}

.dot.active {
  background: #ffbf00;
  width: 20px;
  border-radius: 3px;
}

.next-btn {
  --border-radius: 16px;
  height: 60px;
  font-weight: 800;
}

.gold-glow { box-shadow: 0 0 20px rgba(255, 191, 0, 0.3); }
.silver-glow { box-shadow: 0 0 20px rgba(255, 255, 255, 0.1); }
.lock-glow { box-shadow: 0 0 20px rgba(45, 211, 111, 0.1); }

/* Animations */
.animate-fade {
  animation: fadeIn 0.5s ease;
}

.animate-slide {
  animation: slideIn 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
