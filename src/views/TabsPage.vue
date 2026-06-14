<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar v-if="!isSuperAdmin" slot="bottom" class="glass-tab-bar">
        <ion-tab-button tab="tab1" href="/tabs/tab1" @click="playHaptic">
          <ion-icon aria-hidden="true" :icon="flowerOutline" />
          <ion-label>Garden</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tab2" href="/tabs/tab2" class="buzz-button nest-tab" @click="playHaptic">
          <ion-icon aria-hidden="true" :icon="flaskOutline" />
          <ion-label>BuzzLab</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="my-days" href="/tabs/my-days" class="days-button" @click="playHaptic">
          <ion-icon aria-hidden="true" :icon="waterOutline" />
          <ion-label>My Days</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tab3" href="/tabs/tab3" @click="playHaptic">
          <ion-icon aria-hidden="true" :icon="settingsOutline" />
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { flowerOutline, waterOutline, settingsOutline, flaskOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useUserService } from '@/services/UserService';

const { isSuperAdmin } = useUserService();

const playHaptic = () => {
  Haptics.impact({ style: ImpactStyle.Light });
};
</script>

<style scoped>
.glass-tab-bar {
  --background: transparent;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-top: 1px solid var(--tab-bar-border);
  height: clamp(60px, 12vh, 75px);
  border-radius: 30px 30px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

ion-tab-button {
  --color-selected: var(--ion-color-primary);
  --color: #888;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

ion-tab-button::part(native) {
  overflow: visible;
}

/* Icon Pop Animation */
ion-tab-button.tab-selected ion-icon {
  transform: scale(1.2) translateY(-2px);
  animation: tab-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Label Slide/Fade Animation */
ion-tab-button ion-label {
  transition: transform 0.3s ease, opacity 0.3s ease;
  font-weight: 600;
  letter-spacing: 0.3px;
  font-size: clamp(9px, 2.5vw, 11px);
}

ion-tab-button.tab-selected ion-label {
  transform: translateY(-1px);
}

@keyframes tab-pop {
  0% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.4) translateY(-4px); }
  100% { transform: scale(1.2) translateY(-2px); }
}

.buzz-button {
  --color-selected: var(--ion-color-secondary);
}

.days-button {
  --color-selected: var(--ion-color-primary);
}

ion-icon {
  font-size: clamp(20px, 6vw, 26px);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-nest-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.custom-nest-icon img {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 0 5px rgba(255, 191, 0, 0.3)) grayscale(1) opacity(0.6);
  transition: all 0.3s ease;
  -webkit-mask-image: radial-gradient(circle, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%);
  mask-image: radial-gradient(circle, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%);
}

ion-tab-button.tab-selected .custom-nest-icon img {
  filter: drop-shadow(0 0 8px rgba(255, 191, 0, 0.5)) grayscale(0) opacity(1);
  transform: scale(1.2);
}

ion-tab-button.tab-selected .custom-nest-icon {
    transform: translateY(-2px);
}
</style>
