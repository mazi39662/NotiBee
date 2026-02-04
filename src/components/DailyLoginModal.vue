<template>
  <ion-modal 
    :is-open="isOpen" 
    @didDismiss="$emit('close')"
    class="daily-login-modal"
    :backdrop-dismiss="false"
  >
    <div class="modal-wrapper glass-panel">
      <div class="modal-header">
        <div class="bee-crown">
          <ion-icon :icon="trophyOutline" class="crown-icon"></ion-icon>
        </div>
        <h2>Daily Nectar</h2>
        <p>Don't miss a day! Missing one day resets the flow.</p>
      </div>

      <ion-content class="modal-body" :scroll-y="true">
        <div class="calendar-grid">
          <div 
            v-for="day in 30" 
            :key="day" 
            class="day-hex-wrapper animate-entrance"
            :class="{ 
              'active': day === currentDay, 
              'claimed': day < currentDay,
              'grand-prize': day === 30 
            }"
            :style="{ animationDelay: (day * 0.1) + 's' }"
          >
            <div class="hex-container">
              <div class="hex-shape">
                <div class="hex-content">
                  <span class="day-num">{{ day }}</span>
                  <div class="reward-icon">
                    <span v-if="day === 30" class="giant-jar">🍯</span>
                    <span v-else class="drop-icon">💧</span>
                  </div>
                  <span class="reward-val">+{{ REWARDS[day] }}</span>
                </div>
                <!-- Liquid Fill Animation for claimed days -->
                <div class="honey-fill" v-if="day < currentDay || (day === currentDay && isClaimedToday)"></div>
                
                <!-- Claim Burst Animation -->
                <div class="claim-burst" v-if="day === currentDay && justClaimed">
                  <div class="particle" v-for="p in 6" :key="p"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ion-content>

      <div class="modal-footer">
        <button 
          @click="handleClaim" 
          class="claim-btn gold-glow" 
          :disabled="isClaimedToday || isClaiming"
        >
          <div class="btn-inner" v-if="!isClaiming">
            <span v-if="isClaimedToday">COME BACK TOMORROW</span>
            <span v-else>CLAIM {{ REWARDS[currentDay] }} DROPS</span>
            <ion-icon :icon="flash" v-if="!isClaimedToday"></ion-icon>
          </div>
          <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
        </button>
        <button v-if="isClaimedToday" @click="$emit('close')" class="close-text-btn">
          CLOSE
        </button>
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonModal, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { trophyOutline, flash, waterOutline } from 'ionicons/icons';
import { useDailyLoginService } from '@/services/DailyLoginService';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close', 'claimed']);

const { loginData, isClaimedToday, REWARDS, claimReward } = useDailyLoginService();

const isClaiming = ref(false);
const justClaimed = ref(false);
const currentDay = computed(() => {
    // If they already claimed today, they are on day 'currentStreak'
    // If they haven't claimed today, their potential day is 'currentStreak + 1'
    return (isClaimedToday.value || justClaimed.value) ? loginData.value.currentStreak : loginData.value.currentStreak + 1;
});

const handleClaim = async () => {
    if (isClaimedToday.value || isClaiming.value) return;

    isClaiming.value = true;
    await Haptics.impact({ style: ImpactStyle.Heavy });

    const result = await claimReward();
    if (result) {
        await Haptics.notification({ type: 'SUCCESS' as any });
        justClaimed.value = true;
        
        // Brief delay before showing as fully "claimed today" state
        setTimeout(() => {
            isClaiming.value = false;
            emit('claimed', result);
        }, 2000);
    } else {
        isClaiming.value = false;
    }
};
</script>

<style scoped>
.daily-login-modal {
  --height: 85%;
  --border-radius: 30px;
  --background: transparent;
}

.modal-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 18, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 30px;
  color: white;
  overflow: hidden;
}

.modal-header {
  text-align: center;
  padding: 20px 0;
}

.bee-crown {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
  box-shadow: 0 10px 20px rgba(255, 165, 0, 0.3);
}

.crown-icon {
  font-size: 30px;
  color: #121212;
}

.modal-header h2 {
  font-size: 28px;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(to right, #fff, #FFD700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.modal-header p {
  font-size: 13px;
  color: #888;
  margin: 5px 0 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  padding: 10px;
}

.day-hex-wrapper {
  aspect-ratio: 1;
  position: relative;
  transition: transform 0.3s ease;
  opacity: 0;
}

.animate-entrance {
  animation: hexEntrance 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes hexEntrance {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(30px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.active {
  transform: scale(1.1);
  z-index: 2;
}

.hex-container {
  width: 100%;
  height: 100%;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: rgba(255, 255, 255, 0.08); /* Slightly brighter for better visibility without border */
  position: relative;
}

.hex-shape {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.hex-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  text-align: center;
}

.day-num {
  font-size: 10px;
  font-weight: 800;
  color: #666;
  margin-bottom: 2px;
}

.reward-icon {
  font-size: 16px;
  margin-bottom: 2px;
}

.reward-val {
  font-size: 11px;
  font-weight: 700;
  color: #ffd700;
}

.honey-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to top, #FFA500, #FFD700);
  animation: fillUp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  z-index: 1;
}

@keyframes fillUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Claim Burst */
.claim-burst {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}

.particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: #FFD700;
  border-radius: 50%;
  animation: burstOut 0.8s ease-out forwards;
}

@keyframes burstOut {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { 
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0);
    opacity: 0; 
  }
}

.particle:nth-child(1) { --tx: 40px; --ty: 0px; animation-delay: 0s; }
.particle:nth-child(2) { --tx: -40px; --ty: 0px; animation-delay: 0.05s; }
.particle:nth-child(3) { --tx: 0px; --ty: 40px; animation-delay: 0.1s; }
.particle:nth-child(4) { --tx: 0px; --ty: -40px; animation-delay: 0.15s; }
.particle:nth-child(5) { --tx: 28px; --ty: 28px; animation-delay: 0.2s; }
.particle:nth-child(6) { --tx: -28px; --ty: -28px; animation-delay: 0.25s; }

.active .hex-container {
  background: rgba(255, 215, 0, 0.2);
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.4);
  animation: pulseToday 2s infinite ease-in-out;
}

@keyframes pulseToday {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.05); opacity: 1; }
}

.active .day-num {
  color: #ffd700;
  animation: bounceText 2s infinite ease-in-out;
}

@keyframes bounceText {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.grand-prize {
  grid-column: span 2;
  aspect-ratio: 2/1;
}

.grand-prize .hex-container {
  clip-path: none;
  border-radius: 15px;
}

.giant-jar {
  font-size: 1.5rem;
}

.modal-footer {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.claim-btn {
  width: 100%;
  padding: 18px;
  border-radius: 18px;
  border: none;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #121212;
  font-weight: 900;
  font-size: 16px;
  transition: all 0.3s ease;
}

.claim-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #666;
}

.gold-glow {
  box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
}

.btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.close-text-btn {
  background: transparent;
  border: none;
  color: #888;
  font-weight: 700;
  font-size: 12px;
  padding: 10px;
}
</style>
