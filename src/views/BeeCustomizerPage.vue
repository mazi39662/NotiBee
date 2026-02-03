<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab3"></ion-back-button>
        </ion-buttons>
        <ion-title>Bee Customizer</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="customizer-content">
      <div class="customizer-container">
        <!-- Bee Preview Section -->
        <div class="preview-card glass-panel gold-glow">
          <div class="bee-stage">
             <BeeComposite 
               :customization="selections" 
               :animated="true"
             />
          </div>
          <div class="preview-footer">
             <h2>Customize Your Bee</h2>
             <p>Create your unique identity in the Hive.</p>
          </div>
        </div>

        <!-- Customization Menu -->
        <BeeCustomizerOptions 
          v-model:active-category="activeCategory"
          :selections="selections"
          @update:selections="handleSelectionUpdate"
        />

        <ion-button expand="block" class="save-btn" @click="saveCustomization">
          SAVE PROFILE BEE
        </ion-button>
      </div>

      <HiveSplash :show="showSplash" status-text="Saving your bee..." />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, IonButton, toastController
} from '@ionic/vue';
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import HiveSplash from '@/components/HiveSplash.vue';
import BeeCustomizerOptions from '@/components/BeeCustomizerOptions.vue';
import BeeComposite from '@/components/BeeComposite.vue';
import { useUserService } from '@/services/UserService';
import { checkmarkCircleOutline } from 'ionicons/icons';

const router = useRouter();
const { userBeeId, updateBeeCustomization, getUserProfile } = useUserService();
const showSplash = ref(false);
const activeCategory = ref('top');

const selections = reactive({
  top: 'none',
  body: 'none',
  eyes: 'none'
});

const handleSelectionUpdate = ({ category, value }: { category: 'top' | 'body' | 'eyes', value: string }) => {
  selections[category] = value;
};

onMounted(async () => {
  if (userBeeId.value) {
    const profile = await getUserProfile(userBeeId.value);
    if (profile?.customization) {
      selections.top = profile.customization.top || 'none';
      selections.body = profile.customization.body || 'none';
      selections.eyes = profile.customization.eyes || 'none';
      localStorage.setItem('bee_customization', JSON.stringify(selections));
    } else {
       const saved = localStorage.getItem('bee_customization');
       if (saved) {
         const parsed = JSON.parse(saved);
         selections.top = parsed.top || 'none';
         selections.body = parsed.body || 'none';
         selections.eyes = parsed.eyes || 'none';
       }
    }
  }
});

const saveCustomization = async () => {
  showSplash.value = true;
  try {
    await updateBeeCustomization({ ...selections });
    localStorage.setItem('bee_customization', JSON.stringify(selections));
    showSplash.value = false;
    
    const toast = await toastController.create({
      message: 'Your Bee has been updated! 🐝',
      duration: 2000,
      color: 'primary',
      icon: checkmarkCircleOutline,
      position: 'top'
    });
    await toast.present();
    router.back();
  } catch (e) {
    console.error('Save failed:', e);
    showSplash.value = false;
  }
};
</script>

<style scoped>
.customizer-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.customizer-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 500px;
  margin: 0 auto;
}

.preview-card {
  padding: 40px 20px;
  border-radius: 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.bee-stage {
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preview-footer h2 {
  font-weight: 900;
  margin: 0;
  color: var(--ion-color-primary);
  font-size: 24px;
  letter-spacing: -0.5px;
}

.preview-footer p {
  color: rgba(255, 255, 255, 0.6);
  margin: 8px 0 0;
  font-size: 14px;
}

.save-btn {
  --border-radius: 16px;
  height: 56px;
  font-weight: 800;
  margin-top: 8px;
  --box-shadow: 0 4px 15px rgba(255, 191, 0, 0.3);
}

.gold-glow {
  box-shadow: 0 0 30px rgba(255, 191, 0, 0.15);
  border: 1px solid rgba(255, 191, 0, 0.2);
}
</style>
