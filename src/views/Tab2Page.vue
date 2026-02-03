<template>
  <ion-page>
 

    <ion-content :fullscreen="true">
      <!-- Decorative Background Elements -->
      <div class="hub-deco-blurs">
        <div class="blur-blob yellow"></div>
        <div class="blur-blob orange"></div>
      </div>

      <div class="rooms-container">
        <!-- New Fun Header -->
        <div class="colony-hub-header animate-in">
          <div class="hub-badge">HIVE HUB</div>
          <h1>Gather your <span class="highlight">Colony</span></h1>
          
          
        </div>

        <!-- Loading State -->
        <div v-if="isLoading && rooms.length === 0" class="loading-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Gathering the swarm...</p>
        </div>

        <div v-if="rooms.length === 0" class="empty-state animate-in">
          <div class="empty-hive-visual">
            <div class="empty-icon-wrap gold-glow">🐝</div>
            <div class="empty-icon-wrap gold-glow">🐝</div>
            <div class="empty-icon-wrap gold-glow">🐝</div>
          </div>
          <h2 class="premium-title">No Hive Rooms yet</h2>
          <p class="premium-subtitle">The colony is quiet. Create a room to start the swarm and buzz with multiple bees at once!</p>
          <button @click="isCreateModalOpen = true" class="create-first-btn gold-glow vibrant-btn">
            GATHER THE SWARM
          </button>
        </div>

        <div v-else class="room-list">
          <div 
            v-for="(room, index) in rooms" 
            :key="room.id" 
            class="room-card glass-panel animate-in"
            :style="{ animationDelay: (index * 0.1) + 's' }"
            @click="openRoom(room)"
          >
            <div class="room-card-inner">
                <div class="room-avatar nest-avatar-mini">
                  <img src="/assets/nest.png" alt="Nest" />
                  <div class="online-ring"></div>
                </div>
                <div class="room-info">
                  <div class="room-header-row">
                    <h3 class="room-name">{{ room.name }}</h3>
                    <span class="room-time" v-if="room.lastMessageTime">
                      {{ formatTime(room.lastMessageTime) }}
                    </span>
                  </div>
                  <p class="room-preview">
                    {{ room.lastMessage || 'No messages yet. Start the buzz!' }}
                  </p>
                  <div class="room-meta-row">
                    <div class="member-count">
                        <ion-icon :icon="peopleOutline"></ion-icon>
                        <span>{{ room.members.length }} bees</span>
                    </div>
                  </div>
                </div>
                <div class="room-arrow">
                    <ion-icon :icon="chevronForwardOutline"></ion-icon>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Action Button for Fun -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="fun-fab">
        <ion-fab-button @click="isCreateModalOpen = true" color="primary">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Create Room Modal -->
      <ion-modal 
        :is-open="isCreateModalOpen" 
        @didDismiss="isCreateModalOpen = false"
        :initial-breakpoint="0.8"
        :breakpoints="[0, 0.8, 1]"
        class="create-room-modal"
      >
        <div class="modal-wrapper">
          <div class="modal-header">
            <h2>New Hive Room</h2>
            <p>Gather your colony friends.</p>
          </div>

          <div class="modal-body">
            <div class="field-container glass-panel">
              <ion-item lines="none" class="custom-item">
                <ion-icon :icon="homeOutline" slot="start" color="primary"></ion-icon>
                <ion-input 
                  label="Room Name" 
                  label-placement="stacked" 
                  placeholder="e.g. Work Hive, Family Nest" 
                  v-model="newRoomName"
                ></ion-input>
              </ion-item>
            </div>

            <p class="section-label">Select Members</p>
            
            <!-- Search Bar -->
            <div class="search-container glass-panel">
              <ion-item lines="none" class="custom-item">
                <ion-icon :icon="searchOutline" slot="start" color="medium"></ion-icon>
                <ion-input 
                  placeholder="Search bees..." 
                  v-model="searchQuery"
                  clear-input
                ></ion-input>
              </ion-item>
            </div>
            <div class="members-list-container glass-panel">
              <ion-list lines="full" class="custom-list">
                <ion-item 
                  v-for="friend in filteredFriends" 
                  :key="friend" 
                  @click="toggleFriendSelection(friend)"
                  class="friend-list-item"
                  :class="{ selected: selectedFriends.includes(friend) }"
                >
                  <div class="friend-list-content">
                    <span class="emoji">🐝</span>
                    <h3>{{ friend }}</h3>
                  </div>
                  <ion-checkbox 
                    slot="end" 
                    :checked="selectedFriends.includes(friend)"
                  ></ion-checkbox>
                </ion-item>
              </ion-list>

              <div v-if="filteredFriends.length === 0 && searchQuery" class="no-results">
                <p>No bees match "{{ searchQuery }}"</p>
              </div>

              <div v-if="friends.length > 20 && !searchQuery" class="truncated-note">
                <p>Showing first 20 friends. Use search to find more!</p>
              </div>

              <div v-if="friends.length === 0" class="no-friends-warning">
                <ion-icon :icon="alertCircleOutline"></ion-icon>
                <p>You need friends to create a room! Add some bees in the Hive first.</p>
              </div>
            </div>

            <!-- Create Button inside Body -->
            <div class="modal-action-row animate-in" style="animation-delay: 0.2s">
              <button 
                @click="handleCreateRoom" 
                class="buzz-send-btn gold-glow vibrant-btn" 
                :disabled="!newRoomName || selectedFriends.length === 0 || isCreating"
              >
                <div v-if="!isCreating" class="btn-content">
                  <span>CREATE NEW HIVE</span>
                  <ion-icon :icon="addOutline"></ion-icon>
                </div>
                <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
              </button>
            </div>
          </div>

        </div>
      </ion-modal>

      <HiveSplash :show="showSplash" status-text="Opening the Hive Hub..." />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonContent, 
  IonIcon, IonSpinner, IonButtons, IonButton, IonModal,
  IonItem, IonInput, alertController, IonList, IonCheckbox,
  IonFab, IonFabButton
} from '@ionic/vue';
import { 
  addOutline, peopleOutline, chevronForwardOutline, 
  homeOutline, checkmarkCircle, alertCircleOutline, searchOutline,
  closeOutline
} from 'ionicons/icons';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import HiveSplash from '@/components/HiveSplash.vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useRoomService } from '@/services/RoomService';
import { useUserService } from '@/services/UserService';

const router = useRouter();
const roomService = useRoomService();
const { getFriends } = useUserService();
const rooms = roomService.rooms;
const isLoading = roomService.isLoading;
const friends = getFriends();

const isCreateModalOpen = ref(false);
const isCreating = ref(false);
const newRoomName = ref('');
const searchQuery = ref('');
const selectedFriends = ref<string[]>([]);
const showSplash = ref(true);

const filteredFriends = computed(() => {
  let list = friends.value;
  if (searchQuery.value) {
    list = list.filter(f => f.toLowerCase().includes(searchQuery.value.toLowerCase()));
  }
  // Limit to 20 for performance/UI
  return list.slice(0, 20);
});

let unsubscribeRooms: any = null;

onMounted(() => {
  unsubscribeRooms = roomService.fetchRooms();
  
  setTimeout(() => {
    showSplash.value = false;
  }, 1000);
});

onUnmounted(() => {
  if (unsubscribeRooms) unsubscribeRooms();
});

const toggleFriendSelection = (id: string) => {
  const index = selectedFriends.value.indexOf(id);
  if (index === -1) {
    selectedFriends.value.push(id);
  } else {
    selectedFriends.value.splice(index, 1);
  }
  Haptics.impact({ style: ImpactStyle.Light });
};

const handleCreateRoom = async () => {
  if (!newRoomName.value || selectedFriends.value.length === 0) return;

  isCreating.value = true;
  try {
    const roomId = await roomService.createRoom(newRoomName.value, selectedFriends.value);
    isCreateModalOpen.value = false;
    newRoomName.value = '';
    selectedFriends.value = [];
    Haptics.impact({ style: ImpactStyle.Heavy });
    
    // Auto open the new room
    if (roomId) {
      router.push(`/tabs/tab2/room/${roomId}`);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    const alert = await alertController.create({
      header: 'Creation Failed',
      message: 'The swarm is busy. Please try again later!',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    isCreating.value = false;
  }
};

const openRoom = (room: any) => {
  Haptics.impact({ style: ImpactStyle.Medium });
  router.push(`/tabs/tab2/room/${room.id}`);
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.rooms-container {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  text-align: center;
  padding: 20px;
}

.empty-hive-visual {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.empty-icon-wrap {
  font-size: 40px;
  width: 80px;
  height: 80px;
  background: rgba(255, 191, 0, 0.05);
  border: 1px solid rgba(255, 191, 0, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  animation: hover-bee 3s ease-in-out infinite;
}

.empty-icon-wrap:nth-child(2) { animation-delay: 0.5s; }
.empty-icon-wrap:nth-child(3) { animation-delay: 1s; }

@keyframes hover-bee {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.premium-title {
  font-weight: 900;
  font-size: 28px;
  margin-bottom: 12px;
  background: linear-gradient(to bottom, #ffffff 0%, #aaaaaa 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.premium-subtitle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 15px;
  line-height: 1.6;
  max-width: 280px;
  margin-bottom: 40px;
}

.create-first-btn {
  background: #ffbf00;
  color: black;
  border: none;
  outline: none;
  padding: 18px 40px;
  border-radius: 20px;
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: all 0.3s;
  -webkit-tap-highlight-color: transparent;
}

.create-first-btn:active {
  transform: scale(0.95);
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-card {
  display: flex;
  align-items: center;
  padding: 0;
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.2s;
  position: relative;
  overflow: hidden;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.room-card:active {
  transform: scale(0.98);
}

.room-avatar {
  width: 56px;
  height: 56px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
  flex-shrink: 0;
  overflow: visible;
}

.nest-avatar-mini img {
    width: 85%;
    height: auto;
    filter: drop-shadow(0 0 8px rgba(255, 191, 0, 0.4)) contrast(1.2) brightness(1.2);
    mix-blend-mode: screen;
    -webkit-mask-image: radial-gradient(circle, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%);
  mask-image: radial-gradient(circle, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%);
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.room-name {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--ion-text-color);
  padding-right: 5px;
}

.room-time {
  font-size: 11px;
  color: #888;
  font-weight: 600;
}

.room-preview {
  margin: 0;
  font-size: 13px;
  color: #aaa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.member-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ion-color-primary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.member-count ion-icon {
  font-size: 14px;
}

.arrow-icon {
  font-size: 20px;
  color: #444;
  margin-left: 8px;
}

/* Modal Styling */
.modal-wrapper {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
  color: white;
}

.modal-header {
  text-align: center;
  margin-bottom: 30px;
}

.modal-header h2 {
  margin: 0;
  font-weight: 900;
  font-size: 28px;
  background: linear-gradient(to right, #ffbf00, #ff8c00);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
}

.modal-header p {
  color: rgba(255, 255, 255, 0.5);
  margin: 4px 0 0;
  font-size: 14px;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.modal-body::-webkit-scrollbar {
  width: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 191, 0, 0.2);
  border-radius: 10px;
}

.section-label {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #ffbf00;
  margin: 24px 0 12px 4px;
  opacity: 0.8;
}

.field-container {
  padding: 4px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 191, 0, 0.2);
  margin-bottom: 20px;
  box-shadow: inset 0 0 15px rgba(255, 191, 0, 0.05);
}

.custom-item {
  --background: transparent;
  --color: white;
  --padding-start: 12px;
  --highlight-color-focused: #ffbf00;
}

.custom-item ion-icon {
  font-size: 22px;
  margin-right: 12px;
}

.search-container {
    margin-bottom: 15px;
    padding: 2px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.members-list-container {
    border-radius: 20px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.friend-list-item {
    --background: transparent;
    --color: white;
    --padding-start: 16px;
    --inner-padding-end: 16px;
    --min-height: 56px;
    --border-color: rgba(255, 255, 255, 0.05);
    transition: background 0.2s;
}

.friend-list-item:hover {
    --background: rgba(255, 191, 0, 0.05);
}

.friend-list-content {
    display: flex;
    align-items: center;
    gap: 14px;
}

.friend-list-content h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.2px;
}

.friend-list-content .emoji {
    font-size: 22px;
    filter: drop-shadow(0 0 5px rgba(255, 191, 0, 0.3));
}

.no-results {
    text-align: center;
    padding: 30px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 14px;
}

.truncated-note {
    text-align: center;
    padding: 12px;
    font-size: 11px;
    color: rgba(255, 191, 0, 0.5);
    font-style: italic;
    background: rgba(0,0,0,0.2);
}

.custom-list {
    background: transparent;
    padding: 0;
}

ion-checkbox {
    --size: 22px;
    --checkbox-background-checked: #ffbf00;
    --checkmark-color: #000;
    --border-color: rgba(255, 191, 0, 0.3);
    --border-radius: 6px;
}

.no-friends-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 68, 68, 0.08);
  padding: 16px;
  border-radius: 16px;
  margin-top: 20px;
  border: 1px solid rgba(255, 68, 68, 0.2);
}

.no-friends-warning ion-icon {
  color: #ff4444;
  font-size: 20px;
}

.no-friends-warning p {
  margin: 0;
  font-size: 13px;
  color: #ff8888;
  line-height: 1.4;
}

.modal-action-row {
  margin-top: 30px;
  padding-bottom: 30px;
}

.buzz-send-btn {
  width: 100%;
  height: 64px;
  background: #ffbf00;
  border: none;
  border-radius: 20px;
  font-weight: 900;
  font-size: 16px;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.buzz-send-btn:active {
  transform: scale(0.96);
}

.buzz-send-btn:disabled {
  opacity: 0.3;
  background: #222;
  color: rgba(255, 255, 255, 0.2);
}

.vibrant-btn {
  box-shadow: 0 10px 20px rgba(255, 191, 0, 0.2);
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* Animations */
.animate-in {
  animation: slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

ion-content {
  --background: var(--ion-background-color);
  background-image: 
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%23ffbf00' stroke-opacity='0.12' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 56px 100px;
  background-repeat: repeat;
}

.hub-deco-blurs {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 0;
}

.blur-blob {
    position: absolute;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.1;
    animation: blob-float 15s infinite alternate ease-in-out;
}

.blur-blob.yellow {
    background: #ffbf00;
    top: 10%;
    left: -100px;
}

.blur-blob.orange {
    background: #ff6b35;
    bottom: 20%;
    right: -100px;
    animation-delay: -5s;
}

@keyframes blob-float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(40px, 40px) scale(1.2); }
}

.colony-hub-header {
    text-align: center;
    padding: 30px 10px 40px;
}

.hub-badge {
    display: inline-block;
    padding: 4px 12px;
    background: rgba(255, 191, 0, 0.1);
    border: 1px solid rgba(255, 191, 0, 0.2);
    border-radius: 20px;
    font-size: 10px;
    font-weight: 900;
    color: #ffbf00;
    letter-spacing: 2px;
    margin-bottom: 15px;
}

.colony-hub-header h1 {
    margin: 0;
    font-size: 32px;
    font-weight: 900;
    color: white;
    letter-spacing: -1px;
}

.colony-hub-header .highlight {
    color: #ffbf00;
}

.colony-hub-header p {
    margin: 8px 0 0;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    font-weight: 500;
}

.room-card {
    padding: 0;
    overflow: hidden;
    margin-bottom: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.room-card-inner {
    padding: 18px;
    display: flex;
    align-items: center;
    position: relative;
}

.room-card:active {
    background: rgba(255, 191, 0, 0.05);
    border-color: rgba(255, 191, 0, 0.2);
}

.online-ring {
    position: absolute;
    top: -4px; left: -4px; right: -4px; bottom: -4px;
    border: 2px solid rgba(255, 191, 0, 0.2);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.3s;
}

.room-card:active .online-ring {
    opacity: 1;
    animation: ring-pulse 1s infinite;
}

@keyframes ring-pulse {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(1.2); opacity: 0; }
}

.room-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
}


.room-arrow {
    color: #444;
    font-size: 18px;
    margin-left: 10px;
}

.fun-fab {
    margin-bottom: 20px;
    margin-right: 10px;
}

.fun-fab ion-fab-button {
    --box-shadow: 0 8px 25px rgba(255, 191, 0, 0.4);
    --border-radius: 16px;
    height: 60px;
    width: 60px;
}

/* Honey Drop Animation */
.hub-deco-blurs::after {
    content: '🍯';
    position: absolute;
    font-size: 24px;
    top: -50px;
    left: 20%;
    opacity: 0.1;
    animation: honey-drop 10s infinite linear;
}

.hub-deco-blurs::before {
    content: '🐝';
    position: absolute;
    font-size: 20px;
    top: -50px;
    right: 25%;
    opacity: 0.1;
    animation: honey-drop 12s infinite linear 3s;
}

@keyframes honey-drop {
    0% { transform: translateY(-50px) rotate(0deg); opacity: 0; }
    10% { opacity: 0.2; }
    90% { opacity: 0.2; }
    100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
}

/* Modal Enhancements */
.create-room-modal .modal-wrapper {
    background: linear-gradient(180deg, #16213e 0%, #1a1a2e 100%);
    border-top: 1px solid rgba(255, 191, 0, 0.3);
}
</style>
