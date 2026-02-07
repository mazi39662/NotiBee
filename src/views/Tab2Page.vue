<template>
  <ion-page>
    <ion-content :fullscreen="true" class="buzz-lab-content">
      <!-- Decorative Background Elements -->
      <div class="lab-deco-blurs">
        <div class="blur-blob purple"></div>
        <div class="blur-blob blue"></div>
      </div>

      <div class="lab-container">
        <!-- Lab Header -->
        <div class="lab-header animate-in">
          <div class="lab-badge">BUZZ LAB</div>
          <h1>Experimental <span class="highlight">Zone</span></h1>
          <p>Discover new ways to interact with the colony.</p>
        </div>

        <!-- Grid of Cards -->
        <div class="lab-grid">
          <div 
            v-for="(card, index) in labCards" 
            :key="card.title" 
            class="lab-card glass-panel animate-in"
            :style="{ animationDelay: (index * 0.1) + 's' }"
            @click="navigate(card.path)"
          >
            <div class="card-icon-wrap" :style="{ background: card.color }">
              <ion-icon :icon="card.icon"></ion-icon>
            </div>
            <div class="card-content">
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
            </div>
            <div class="card-arrow">
              <ion-icon :icon="chevronForwardOutline"></ion-icon>
            </div>
          </div>
        </div>

        <div v-if="labCards.length === 0" class="empty-lab">
          <ion-icon :icon="flaskOutline" class="giant-icon"></ion-icon>
          <h2>The lab is quiet</h2>
          <p>New experiments are being prepared.</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonContent, IonIcon
} from '@ionic/vue';
import { 
  chevronForwardOutline, flaskOutline, trophyOutline, 
  locationOutline, personOutline, alarmOutline, 
  shieldOutline, starOutline, colorPaletteOutline
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useUserService } from '@/services/UserService';

const router = useRouter();
const { isAdmin } = useUserService();

const labCards = [
  {
    title: 'Bee Radar',
    description: 'Find bees buzzing near your location.',
    icon: locationOutline,
    path: '/tabs/radar',
    color: 'rgba(255, 191, 0, 0.1)'
  },
  {
    title: 'Achievements',
    description: 'Track your milestones and rewards.',
    icon: starOutline,
    path: '/tabs/achievements',
    color: 'rgba(255, 68, 68, 0.1)'
  },
  {
    title: 'Leaderboard',
    description: 'See the top buzzing bees in the colony.',
    icon: trophyOutline,
    path: '/tabs/leaderboard',
    color: 'rgba(0, 212, 255, 0.1)'
  },
  {
    title: 'Bee Customizer',
    description: 'Evolve your bee with new skins.',
    icon: colorPaletteOutline,
    path: '/tabs/customize-bee',
    color: 'rgba(128, 0, 255, 0.1)'
  },
  {
    title: 'Buzz Reminders',
    description: 'Never miss a buzz. Set your alerts.',
    icon: alarmOutline,
    path: '/tabs/reminders',
    color: 'rgba(0, 255, 128, 0.1)'
  }
];

if (isAdmin.value) {
  labCards.push({
    title: 'Admin Hub',
    description: 'System-level controls and insights.',
    icon: shieldOutline,
    path: '/tabs/admin',
    color: 'rgba(255, 255, 255, 0.05)'
  });
}

const navigate = (path: string) => {
  Haptics.impact({ style: ImpactStyle.Medium });
  router.push(path);
};
</script>

<style scoped>
.buzz-lab-content {
  --background: var(--ion-background-color);
  background-image: 
    radial-gradient(circle at 50% 50%, rgba(255, 191, 0, 0.03) 0%, transparent 70%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M12 2L4 5v14l8 3 8-3V5l-8-3zm0 2.2L18 6.4v11.2l-6 2.2-6-2.2V6.4l6-2.2z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E");
}

.lab-container {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.lab-header {
  text-align: left;
  margin-bottom: 40px;
  padding-top: 20px;
}

.lab-badge {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(163, 71, 255, 0.1);
    border: 1px solid rgba(163, 71, 255, 0.2);
    border-radius: 20px;
    font-size: 11px;
    font-weight: 900;
    color: #a347ff;
    letter-spacing: 2px;
    margin-bottom: 16px;
    text-transform: uppercase;
}

.lab-header h1 {
  margin: 0;
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 900;
  color: white;
  letter-spacing: -1.5px;
  line-height: 1.1;
}

.lab-header .highlight {
  color: #ffbf00;
  background: linear-gradient(to right, #ffbf00, #ff8c00);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.lab-header p {
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  max-width: 300px;
}

.lab-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .lab-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.lab-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}

.lab-card:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-5px);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 30px rgba(0,0,0,0.3);
}

.lab-card:active {
  transform: scale(0.96);
}

.card-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18px;
  flex-shrink: 0;
}

.card-icon-wrap ion-icon {
  font-size: 24px;
  color: white;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: white;
  letter-spacing: -0.3px;
}

.card-content p {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.4;
}

.card-arrow {
  color: rgba(255, 255, 255, 0.2);
  font-size: 20px;
  margin-left: 10px;
}

.lab-deco-blurs {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 0;
}

.blur-blob {
    position: absolute;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.15;
    animation: blob-float 20s infinite alternate ease-in-out;
}

.blur-blob.purple { background: #a347ff; top: -50px; right: -50px; }
.blur-blob.blue { background: #00d4ff; bottom: -50px; left: -50px; animation-delay: -10s; }

@keyframes blob-float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(100px, 100px) scale(1.3); }
}

.animate-in {
  animation: slideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  opacity: 0;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty-lab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
}

.giant-icon {
  font-size: 80px;
  margin-bottom: 20px;
  opacity: 0.2;
}
</style>
