<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="hive-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab1" :icon="chevronBack"></ion-back-button>
        </ion-buttons>
        <ion-title>Buzz Reminders</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="hive-content">
      <div class="reminders-container">
        <!-- Empty State -->
        <div v-if="reminders.length === 0" class="empty-reminders animate-fade-in">
          <div class="empty-icon-wrapper">
             <ion-icon :icon="alarmOutline" class="giant-alarm"></ion-icon>
          </div>
          <h2>No Buzzes Queued</h2>
          <p>Schedule a reminder and we'll vibrate your hive when it's time!</p>
          <ion-button @click="isAddModalOpen = true" class="add-first-btn gold-glow">
            <ion-icon :icon="add" slot="start"></ion-icon>
            NEW REMINDER
          </ion-button>
        </div>

        <!-- List of Reminders -->
        <div v-else class="reminder-list">
          <div 
            v-for="reminder in reminders" 
            :key="reminder.id" 
            class="reminder-card glass-panel animate-in"
            @click="toggleReminder(reminder.id)"
            @touchstart="handleTouchStart($event, reminder)"
            @touchend="handleTouchEnd"
            @mousedown="handleTouchStart($event, reminder)"
            @mouseup="handleTouchEnd"
          >
            <div class="reminder-body">
              <div class="reminder-time-type">
                <span class="reminder-type-badge" :class="reminder.type">{{ getTypeText(reminder) }}</span>
                <span class="reminder-time">{{ formatTime(reminder.time) }}</span>
              </div>
              <div class="reminder-info">
                <h3>{{ reminder.title }}</h3>
                <p>{{ reminder.description }}</p>
              </div>
            </div>
            <div class="reminder-action">
              <ion-toggle 
                mode="ios" 
                :checked="reminder.enabled"
                @ionChange.stop="toggleReminder(reminder.id)"
              ></ion-toggle>
            </div>
          </div>
        </div>
      </div>

      <!-- FAB for adding -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="reminders.length > 0">
        <ion-fab-button class="gold-glow" @click="isAddModalOpen = true">
          <ion-icon :icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Add Reminder Modal -->
      <ion-modal 
        :is-open="isAddModalOpen" 
        @didDismiss="isAddModalOpen = false"
        class="search-modal"
        :initial-breakpoint="0.9"
        :breakpoints="[0, 0.9, 1]"
      >
        <div class="modal-wrapper">
          <div class="modal-header">
            <h2>New Buzz Reminder</h2>
            <p>Set an alert for your future self.</p>
          </div>
          
          <ion-content class="modal-main-content">
             <div class="modal-body-inner">
                <!-- Title & Desc -->
                <div class="input-group glass-panel">
                  <ion-item lines="none" class="input-item">
                    <ion-input 
                      placeholder="Title (e.g. Birthday Alert)" 
                      v-model="newReminder.title" 
                      :maxlength="30"
                      class="custom-input"
                    ></ion-input>
                    <div slot="end" class="char-count">{{ newReminder.title.length }}/30</div>
                  </ion-item>
                  <div class="divider"></div>
                  <ion-item lines="none" class="input-item">
                    <ion-textarea 
                      placeholder="Details (e.g. Don't forget to buzz Queen Bee!)" 
                      v-model="newReminder.description" 
                      :maxlength="100"
                      :auto-grow="true"
                      class="custom-textarea"
                    ></ion-textarea>
                    <div slot="end" class="char-count">{{ newReminder.description.length }}/100</div>
                  </ion-item>
                </div>

                <!-- Type Selector -->
                <div class="type-selector glass-panel">
                  <ion-segment v-model="newReminder.type" mode="ios">
                    <ion-segment-button value="one-time">
                      <ion-label>ONE TIME</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="daily">
                      <ion-label>EVERYDAY</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="custom-dates">
                      <ion-label>CALENDAR</ion-label>
                    </ion-segment-button>
                  </ion-segment>
                </div>

                <!-- Time Picker -->
                <div class="picker-section glass-panel">
                   <div class="section-label">TIME</div>
                   <ion-datetime 
                    presentation="time" 
                    mode="ios" 
                    v-model="newReminder.time"
                    class="time-picker"
                   ></ion-datetime>
                </div>

                <!-- Date Picker (One time / Custom) -->
                <div v-if="newReminder.type !== 'daily'" class="picker-section glass-panel animate-in">
                   <div class="section-label">{{ newReminder.type === 'one-time' ? 'DATE' : 'DATES' }}</div>
                   <ion-datetime 
                    presentation="date" 
                    :multiple="newReminder.type === 'custom-dates'"
                    mode="ios" 
                    v-model="datesModel"
                    class="date-picker"
                    :min="minDate"
                   ></ion-datetime>
                </div>

                <div class="modal-footer-action">
                  <button @click="handleAddReminder" class="buzz-send-btn gold-glow" :disabled="!isFormValid">
                    <div class="btn-inner">
                      <span>SCHEDULE BUZZ</span>
                      <ion-icon :icon="alarmOutline"></ion-icon>
                    </div>
                  </button>
                </div>
             </div>
          </ion-content>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonIcon, IonButton, IonFab, IonFabButton, IonModal, IonInput, IonTextarea,
  IonItem, IonSegment, IonSegmentButton, IonLabel, IonDatetime, IonToggle,
  alertController, toastController
} from '@ionic/vue';
import { 
  chevronBack, add, alarmOutline, timeOutline, calendarOutline, trashOutline
} from 'ionicons/icons';
import { ref, computed } from 'vue';
import { useReminderService, Reminder } from '@/services/ReminderService';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const { reminders, addReminder, deleteReminder, toggleReminder } = useReminderService();

const isAddModalOpen = ref(false);
const minDate = new Date().toISOString();

const newReminder = ref({
  title: '',
  description: '',
  type: 'one-time' as Reminder['type'],
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  dates: [new Date().toISOString()] as string[]
});

const datesModel = computed({
  get: () => newReminder.value.type === 'custom-dates' ? newReminder.value.dates : newReminder.value.dates[0],
  set: (val: any) => {
    if (Array.isArray(val)) {
      newReminder.value.dates = val;
    } else if (val) {
      newReminder.value.dates = [val];
    }
  }
});

const isFormValid = computed(() => {
  return newReminder.value.title.trim().length > 0 && 
         newReminder.value.description.trim().length > 0 &&
         (newReminder.value.type === 'daily' || newReminder.value.dates.length > 0);
});

const getTypeText = (reminder: Reminder) => {
  if (reminder.type === 'daily') return 'EVERYDAY';
  if (reminder.type === 'one-time') return 'ONCE';
  return `${reminder.dates.length} DAYS`;
};

const formatTime = (time: string) => {
  // time might be ISO or HH:mm
  if (time.includes('T')) {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return time;
};

const handleAddReminder = async () => {
    // Extract HH:mm from time picker (it returns ISO or HH:mm)
    let timeStr = newReminder.value.time;
    if (timeStr.includes('T')) {
        const d = new Date(timeStr);
        timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    // dates might be string or array
    let datesArray = Array.isArray(newReminder.value.dates) ? newReminder.value.dates : [newReminder.value.dates];

    await addReminder({
        title: newReminder.value.title,
        description: newReminder.value.description,
        type: newReminder.value.type,
        time: timeStr,
        dates: datesArray,
        enabled: true
    });

    isAddModalOpen.value = false;
    
    // Reset form
    newReminder.value = {
        title: '',
        description: '',
        type: 'one-time',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        dates: [new Date().toISOString()]
    };

    const toast = await toastController.create({
        message: 'Buzz reminder scheduled! 🐝',
        duration: 2000,
        position: 'top',
        color: 'success'
    });
    toast.present();
    Haptics.impact({ style: ImpactStyle.Medium });
};

// Long press logic
let pressTimer: any = null;

const handleTouchStart = (ev: any, reminder: Reminder) => {
    pressTimer = setTimeout(() => {
        confirmDelete(reminder);
    }, 800);
};

const handleTouchEnd = () => {
    if (pressTimer) clearTimeout(pressTimer);
};

const confirmDelete = async (reminder: Reminder) => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    const alert = await alertController.create({
        header: 'Delete Reminder?',
        message: `Remove "${reminder.title}"?`,
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            { 
                text: 'Delete', 
                role: 'destructive',
                handler: () => {
                   deleteReminder(reminder.id);
                }
            }
        ],
        mode: 'ios'
    });
    await alert.present();
};

</script>

<style scoped>
.hive-toolbar {
  --background: rgba(10, 10, 10, 0.8);
  --color: white;
  backdrop-filter: blur(10px);
}

.hive-content {
  --background: #050505;
}

.reminders-container {
  padding: 20px;
  padding-bottom: 100px; /* Space for FAB and tab bar */
  min-height: 100%;
}

.modal-body-inner {
    padding-bottom: 60px; /* Space for the bottom action button */
}

.empty-reminders {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
  color: #888;
}

.empty-icon-wrapper {
  width: 120px;
  height: 120px;
  background: rgba(255, 191, 0, 0.1);
  border-radius: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 191, 0, 0.2);
}

.giant-alarm {
  font-size: 60px;
  color: #ffbf00;
}

.empty-reminders h2 {
  color: white;
  margin: 0 0 10px;
  font-weight: 800;
}

.add-first-btn {
  margin-top: 20px;
  --background: #ffbf00;
  --color: #000;
  --border-radius: 12px;
  font-weight: 800;
  height: 50px;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.reminder-card {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s, background 0.2s;
}

.reminder-card:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.1);
}

.reminder-body {
  flex: 1;
}

.reminder-time-type {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.reminder-type-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
  font-weight: 800;
}

.reminder-type-badge.daily {
  background: rgba(0, 255, 0, 0.1);
  color: #4caf50;
}

.reminder-time {
  font-size: 24px;
  font-weight: 800;
  color: white;
}

.reminder-info h3 {
  margin: 0;
  font-size: 16px;
  color: #ffbf00;
}

.reminder-info p {
  margin: 2px 0 0;
  font-size: 13px;
  color: #888;
}

/* Glass Panel Utility */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.gold-glow {
  box-shadow: 0 0 15px rgba(255, 191, 0, 0.3);
}

/* Modal Styles */
.search-modal {
  --background: transparent;
}

.modal-wrapper {
  background: #0a0a0a;
  height: 100%;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 20px;
}

.modal-header h2 {
  color: white;
  margin: 0;
  font-weight: 800;
}

.modal-header p {
  color: #666;
  margin: 5px 0 20px;
}

.input-group {
  margin-bottom: 20px;
  overflow: hidden;
}

.input-item {
  --background: transparent;
  --color: white;
}

.char-count {
  font-size: 10px;
  color: #555;
  margin-right: 10px;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 16px;
}

.type-selector {
  margin-bottom: 20px;
  padding: 4px;
}

.picker-section {
  margin-bottom: 20px;
  padding: 15px;
}

.section-label {
  font-size: 12px;
  color: #ffbf00;
  font-weight: 800;
  margin-bottom: 10px;
}

.time-picker, .date-picker {
  --background: transparent;
  width: 100%;
  height: auto;
}

.buzz-send-btn {
  width: 100%;
  height: 56px;
  border-radius: 16px;
  background: #ffbf00;
  border: none;
  font-weight: 800;
  margin-top: 20px;
  transition: transform 0.2s;
}

.buzz-send-btn:active {
  transform: scale(0.95);
}

.btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: black;
}

.animate-in {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
</style>
