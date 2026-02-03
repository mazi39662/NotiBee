<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab3"></ion-back-button>
        </ion-buttons>
        <ion-title>Legal & Privacy</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="legal-container">
        <div class="legal-card glass-panel gold-glow">
          <ion-segment v-model="activeTab" mode="ios" class="legal-segment">
            <ion-segment-button value="privacy">
              <ion-label>Privacy Policy</ion-label>
            </ion-segment-button>
            <ion-segment-button value="terms">
              <ion-label>Terms of Service</ion-label>
            </ion-segment-button>
          </ion-segment>

          <div class="legal-content">
            <div v-if="activeTab === 'privacy'" class="animate-fade">
              <h2>Privacy Policy</h2>
              <p class="last-updated">Last Updated: January 23, 2026</p>
              
              <section>
                <h3>1. Data Collection</h3>
                <p>NotiBee is designed with privacy as a core principle. We collect minimal data necessary for the app to function:</p>
                <ul>
                  <li><strong>Bee ID:</strong> A unique identifier you choose to represent yourself in the Hive.</li>
                  <li><strong>Push Token:</strong> A technical identifier required to deliver buzzes to your device.</li>
                  <li><strong>Location Data:</strong> Only if enabled, to show you on the Hive map to your approved friends.</li>
                </ul>
              </section>

              <section>
                <h3>2. Message Handling</h3>
                <p>NotiBee uses a "Free Relay" system. Buzzes are delivered in real-time and are <strong>not stored on our servers permanentely</strong>. Once a buzz is delivered, it is removed from the delivery relay. If you enable "Save Buzz History", your messages are stored <strong>locally on your device only</strong>.</p>
              </section>

              <section>
                <h3>3. Audio Messages</h3>
                <p>Audio messages are temporary. They are uploaded to an encrypted cloud storage bucket and are programmed to <strong>auto-destruct after 2 minutes</strong> of being sent.</p>
              </section>

              <section>
                <h3>4. Data Deletion</h3>
                <p>You have full control over your digital identity. You can dissolve your identity at any time from the Settings menu, which will wipe all associated data from the Hive.</p>
              </section>
            </div>

            <div v-if="activeTab === 'terms'" class="animate-fade">
              <h2>Terms of Service</h2>
              <p class="last-updated">Last Updated: January 23, 2026</p>

              <section>
                <h3>1. Acceptance of Terms</h3>
                <p>By entering the NotiBee Hive, you agree to these terms. If you do not agree, please do not use the app.</p>
              </section>

              <section>
                <h3>2. Community Guidelines</h3>
                <p>The Hive is a swarm of friends. Users are expected to:</p>
                <ul>
                  <li>Be respectful to other bees.</li>
                  <li>Not use the alert/vibration system for harassment.</li>
                  <li>Not upload inappropriate or illegal imagery.</li>
                </ul>
              </section>

              <section>
                <h3>3. Account Security</h3>
                <p>You are responsible for remembering your Bee ID and password. Since NotiBee is designed for privacy, we do not use emails for account recovery. If you lose your password, your ID cannot be recovered.</p>
              </section>

              <section>
                <h3>4. Service Availability</h3>
                <p>NotiBee is provided "as is". While we strive for 100% uptime in the relay, we do not guarantee that buzzes will always be delivered instantaneously due to network conditions.</p>
              </section>
            </div>
          </div>
        </div>

        <div class="legal-footer">
          <p>Created with ❤️ by the NotiBee Team</p>
          <p class="version">v2.0.1 (Stable)</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, IonSegment, IonSegmentButton, IonLabel
} from '@ionic/vue';
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const activeTab = ref('privacy');

onMounted(() => {
  if (route.query.tab === 'terms') {
    activeTab.value = 'terms';
  } else if (route.query.tab === 'privacy') {
    activeTab.value = 'privacy';
  }
});
</script>

<style scoped>
.legal-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.legal-card {
  border-radius: 24px;
  overflow: hidden;
  padding: 20px;
}

.legal-segment {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  margin-bottom: 24px;
  padding: 4px;
}

.legal-content {
  color: #ccc;
  line-height: 1.6;
}

.legal-content h2 {
  color: #ffbf00;
  font-weight: 800;
  margin-bottom: 4px;
}

.last-updated {
  font-size: 12px;
  opacity: 0.5;
  margin-bottom: 24px;
}

.legal-content h3 {
  color: white;
  font-size: 18px;
  font-weight: 700;
  margin-top: 24px;
}

.legal-content p {
  margin-bottom: 16px;
}

.legal-content ul {
  padding-left: 20px;
  margin-bottom: 24px;
}

.legal-content li {
  margin-bottom: 8px;
}

.legal-content li strong {
  color: #ffbf00;
}

.legal-footer {
  text-align: center;
  margin-top: 40px;
  padding-bottom: 40px;
  opacity: 0.4;
  font-size: 12px;
}

.animate-fade {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
