<template>
  <ion-modal 
    :is-open="isOpen" 
    @didDismiss="$emit('close')"
    class="edit-profile-modal"
    :initial-breakpoint="0.85"
    :breakpoints="[0, 0.85, 1]"
  >
    <div class="modal-container">
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>Edit Profile</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="$emit('close')">
              <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <div class="edit-form glass-panel">
          <!-- Status -->
          <div class="input-group">
            <div class="label-row">
              <label class="input-label">Status Humming 🍯</label>
              <span class="char-counter" :class="{ 'at-limit': form.status.length >= 50 }">
                {{ form.status.length }}/50
              </span>
            </div>
            <ion-item lines="none" class="custom-input">
              <ion-input 
                placeholder="What's buzzing?" 
                v-model="form.status"
                :maxlength="50"
              ></ion-input>
              <ion-icon :icon="sparklesOutline" slot="end" color="primary"></ion-icon>
            </ion-item>
            <p class="input-hint">Appear near your name in the Hive.</p>
          </div>

          <!-- Bio -->
          <div class="input-group">
            <div class="label-row">
              <label class="input-label">Bee Bio</label>
              <span class="char-counter" :class="{ 'at-limit': form.bio.length >= 150 }">
                {{ form.bio.length }}/150
              </span>
            </div>
            <ion-item lines="none" class="custom-input">
              <ion-textarea 
                placeholder="Share your story..." 
                v-model="form.bio"
                auto-grow
                :maxlength="150"
              ></ion-textarea>
            </ion-item>
          </div>

          <!-- Gender -->
          <div class="input-group">
            <label class="input-label">Bee Identity</label>
            <div class="gender-selector">
              <button 
                v-for="gender in genders" 
                :key="gender.id"
                class="gender-btn"
                :class="{ active: form.gender === gender.id }"
                @click="selectGender(gender.id)"
              >
                <span class="gender-icon">{{ gender.icon }}</span>
                <span class="gender-label">{{ gender.label }}</span>
              </button>
            </div>
            <!-- Custom Gender Input -->
            <transition name="fade-slide">
              <div v-if="form.gender === 'other'" class="custom-gender-input">
                <div class="label-row mini-label">
                  <label class="input-label">Identity Details</label>
                  <span class="char-counter small-counter" :class="{ 'at-limit': form.customGender.length >= 30 }">
                    {{ form.customGender.length }}/30
                  </span>
                </div>
                <ion-item lines="none" class="custom-input">
                  <ion-input 
                    placeholder="Describe your identity..." 
                    v-model="form.customGender"
                    :maxlength="30"
                  ></ion-input>
                </ion-item>
              </div>
            </transition>
          </div>

          <!-- Age -->
          <div class="input-group">
            <label class="input-label">Age</label>
            <div class="age-stepper">
              <ion-button fill="clear" color="primary" class="step-btn" @click="stepAge(-1)">
                <ion-icon :icon="removeOutline"></ion-icon>
              </ion-button>
              <ion-item lines="none" class="custom-input age-input">
                <ion-input 
                  type="number" 
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="Age" 
                  v-model.number="form.age"
                  min="13"
                  max="120"
                  class="ion-text-center"
                ></ion-input>
              </ion-item>
              <ion-button fill="clear" color="primary" class="step-btn" @click="stepAge(1)">
                <ion-icon :icon="addOutline"></ion-icon>
              </ion-button>
            </div>
          </div>

          <!-- Relationship Status -->
          <div class="input-group">
            <label class="input-label">Hive Status</label>
            <div class="status-selector">
              <button 
                v-for="rel in relationships" 
                :key="rel.id"
                class="status-btn"
                :class="{ active: form.relationship === rel.id }"
                @click="form.relationship = rel.id"
              >
                {{ rel.label }}
              </button>
            </div>
          </div>

          <!-- Hobbies -->
          <div class="input-group">
            <div class="label-row">
              <label class="input-label">Pollinating Interests</label>
              <span class="char-counter" :class="{ 'at-limit': form.hobbies.length >= 10 }">
                {{ form.hobbies.length }}/10 Tags
              </span>
            </div>
            <div class="hobby-input-wrap">
              <ion-item lines="none" class="custom-input hobby-input">
                <ion-input 
                  placeholder="Add a hobby (max 15 chars)..." 
                  v-model="newHobby"
                  :maxlength="15"
                  @keyup.enter="addHobby"
                ></ion-input>
                <ion-button fill="clear" @click="addHobby" :disabled="!newHobby.trim() || form.hobbies.length >= 10">
                  <ion-icon :icon="addOutline"></ion-icon>
                </ion-button>
              </ion-item>
            </div>
            <div class="hobbies-tags">
              <div 
                v-for="(hobby, index) in form.hobbies" 
                :key="index"
                class="hobby-tag gold-glow"
              >
                {{ hobby }}
                <ion-icon :icon="closeCircleOutline" @click="removeHobby(index)"></ion-icon>
              </div>
            </div>
          </div>
        </div>

        <div class="action-footer">
          <ion-button expand="block" color="primary" class="save-btn" @click="handleSave" :disabled="isSaving">
            <span v-if="!isSaving">SAVE PROFILE</span>
            <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
          </ion-button>
        </div>
      </ion-content>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonButton, IonIcon, IonItem, IonInput, 
  IonTextarea, IonSpinner, toastController
} from '@ionic/vue';
import { 
  closeOutline, sparklesOutline, addOutline, 
  closeCircleOutline, removeOutline 
} from 'ionicons/icons';
import { ref, reactive, watch } from 'vue';
import { useUserService } from '@/services/UserService';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const props = defineProps<{
  isOpen: boolean;
  initialData: {
    status?: string;
    bio?: string;
    gender?: string;
    hobbies?: string[];
    age?: number | null;
    relationship?: string;
  };
}>();

const emit = defineEmits(['close', 'saved']);

const { updateProfile } = useUserService();
const isSaving = ref(false);
const newHobby = ref('');

const form = reactive({
  status: '',
  bio: '',
  gender: '',
  customGender: '',
  hobbies: [] as string[],
  age: null as number | null,
  relationship: ''
});

const genders = [
  { id: 'male', label: 'Male Bee', icon: '♂️' },
  { id: 'female', label: 'Female Bee', icon: '♀️' },
  { id: 'other', label: 'Other', icon: '✨' },
  { id: 'private', label: 'Prefer not to say', icon: '🤫' }
];

const relationships = [
  { id: 'single', label: 'Single' },
  { id: 'taken', label: 'Taken' },
  { id: 'complicated', label: 'Complicated' },
  { id: 'private', label: 'Prefer not to say' }
];

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    form.status = props.initialData.status || '';
    form.bio = props.initialData.bio || '';
    
    // Handle gender logic
    const knownGenders = ['male', 'female', 'private'];
    if (props.initialData.gender && !knownGenders.includes(props.initialData.gender)) {
      form.gender = 'other';
      form.customGender = props.initialData.gender;
    } else {
      form.gender = props.initialData.gender || 'private';
      form.customGender = '';
    }

    form.hobbies = [...(props.initialData.hobbies || [])];
    form.age = (props.initialData.age !== undefined && props.initialData.age !== null) ? Number(props.initialData.age) : null;
    form.relationship = props.initialData.relationship || 'private';
  }
});

const stepAge = (amount: number) => {
  const current = form.age || 18;
  const next = current + amount;
  if (next >= 13 && next <= 120) {
    form.age = next;
    Haptics.impact({ style: ImpactStyle.Light });
  }
};

const selectGender = (id: string) => {
  form.gender = id;
  if (id !== 'other') form.customGender = '';
  Haptics.impact({ style: ImpactStyle.Light });
};

const addHobby = () => {
  if (newHobby.value.trim() && form.hobbies.length < 10) {
    form.hobbies.push(newHobby.value.trim());
    newHobby.value = '';
    Haptics.impact({ style: ImpactStyle.Light });
  }
};

const removeHobby = (index: number) => {
  form.hobbies.splice(index, 1);
  Haptics.impact({ style: ImpactStyle.Light });
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    await updateProfile({
      status: form.status,
      bio: form.bio,
      gender: form.gender === 'other' ? form.customGender : form.gender,
      hobbies: form.hobbies,
      age: form.age,
      relationship: form.relationship
    });

    Haptics.notification({ type: ImpactStyle.Heavy as any });
    
    const toast = await toastController.create({
      message: 'Profile updated in the Hive! 🐝✨',
      duration: 2000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
    
    emit('saved');
    emit('close');
  } catch (e) {
    console.error(e);
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.modal-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

ion-toolbar {
  --background: rgba(26, 26, 46, 0.95);
  --color: white;
  --border-style: none;
}

ion-content {
  --background: #1a1a2e;
}

.edit-form {
  padding: 20px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 13px;
  font-weight: 700;
  color: #ffbf00;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mini-label {
  margin-top: 10px;
  margin-bottom: 5px;
}

.char-counter {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
}

.char-counter.at-limit {
  color: var(--ion-color-danger);
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.small-counter {
  font-size: 10px;
}

.custom-input {
  --background: rgba(255, 255, 255, 0.05);
  --color: white;
  --border-radius: 12px;
  --padding-start: 12px;
  border: 1px solid rgba(255, 191, 0, 0.2);
}

.age-stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.age-input {
  flex: 1;
  --padding-start: 0;
}

.step-btn {
  --padding-start: 8px;
  --padding-end: 8px;
  height: 48px;
  background: rgba(255, 191, 0, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 191, 0, 0.2);
  margin: 0;
}

.ion-text-center {
  --text-align: center;
}

.input-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.gender-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.gender-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  transition: all 0.3s ease;
}

.gender-btn.active {
  background: rgba(255, 191, 0, 0.2);
  border-color: #ffbf00;
  box-shadow: 0 0 15px rgba(255, 191, 0, 0.2);
}

.gender-icon {
  font-size: 20px;
}

.gender-label {
  font-size: 14px;
  font-weight: 500;
}

.custom-gender-input {
  margin-top: 10px;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.status-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.status-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-btn.active {
  background: rgba(255, 191, 0, 0.2);
  border-color: #ffbf00;
  box-shadow: 0 0 15px rgba(255, 191, 0, 0.2);
}

.hobbies-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.hobby-tag {
  background: rgba(255, 191, 0, 0.1);
  border: 1px solid rgba(255, 191, 0, 0.3);
  border-radius: 100px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.hobby-tag ion-icon {
  font-size: 16px;
  color: #ffbf00;
  cursor: pointer;
}

.hobby-input ion-button {
  --color: #ffbf00;
}

.action-footer {
  margin-top: 30px;
  padding-bottom: 20px;
}

.save-btn {
  --border-radius: 16px;
  --box-shadow: 0 10px 20px rgba(255, 191, 0, 0.3);
  font-weight: 800;
  font-size: 16px;
  height: 56px;
}
</style>
