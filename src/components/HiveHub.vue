<template>
  <div class="hive-hub-component">
    <!-- Decorative Background Elements -->
    <div class="hub-deco-blurs">
      <div class="blur-blob yellow"></div>
      <div class="blur-blob orange"></div>
    </div>

    <div class="rooms-container">
      <!-- New Fun Header -->
     
      <!-- Buzz Anonymous Feature Card -->
      <div 
        class="anonymous-promo-card glass-panel animate-in gold-glow" 
        @click="router.push('/tabs/anonymous-setup')"
      >
        <div class="promo-content">
          <div class="promo-icon-wrap">
            <ion-icon :icon="flaskOutline"></ion-icon>
          </div>
          <div class="promo-text">
            <h3>Secret Nectar</h3>
            <p>Post an anonymous invite to the hive and get secret blurs.</p>
          </div>
        </div>
        <div class="promo-arrow">
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && rooms.length === 0" class="loading-state">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Gathering the swarm...</p>
      </div>

      <div v-if="rooms.length === 0 && !isLoading" class="empty-state animate-in">
        <div class="empty-hive-visual">
          <div class="empty-icon-wrap gold-glow">🐝</div>
          <div class="empty-icon-wrap gold-glow">🐝</div>
          <div class="empty-icon-wrap gold-glow">🐝</div>
        </div>
        <h2 class="premium-title">No Hive Rooms yet</h2>
        <p class="premium-subtitle">The colony is quiet. Create a room to start the swarm and buzz with multiple bees at once!</p>
        <button @click="isCreateModalOpen = true" class="create-first-btn gold-glow vibrant-btn">
          CREATE GROUP CHAT
        </button>
      </div>

      <div v-else class="room-list">
        <div 
          v-for="(room, index) in rooms" 
          :key="room.id" 
          class="room-card glass-panel animate-in"
          :class="{ 'is-muted': isMuted(room.id) }"
          :style="{ animationDelay: (index * 0.1) + 's' }"
          @click="openRoom(room)"
          @touchstart="handleTouchStart(room)"
          @touchend="handleTouchEnd"
          @mousedown="handleTouchStart(room)"
          @mouseup="handleTouchEnd"
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
                  <ion-icon v-if="isMuted(room.id)" :icon="volumeMuteOutline" class="mute-mini-icon"></ion-icon>
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

    <!-- Floating Action Button -->
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
          <h2>Create Group Chat</h2>
          <p>Gather your colony friends into a swarm.</p>
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
                <span>START GROUP CHAT</span>
                <ion-icon :icon="addOutline"></ion-icon>
              </div>
              <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
            </button>
          </div>
        </div>
      </div>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { 
  IonIcon, IonSpinner, IonModal,
  IonItem, IonInput, alertController, IonList, IonCheckbox,
  IonFab, IonFabButton, actionSheetController, toastController
} from '@ionic/vue';
import { 
  addOutline, peopleOutline, chevronForwardOutline, 
  homeOutline, alertCircleOutline,  searchOutline, linkOutline,
  trashOutline, logOutOutline, volumeMuteOutline, volumeHighOutline,
  closeOutline, flaskOutline
} from 'ionicons/icons';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useRoomService } from '@/services/RoomService';
import { useUserService } from '@/services/UserService';

const router = useRouter();
const roomService = useRoomService();
const { userBeeId, getFriends } = useUserService();
const rooms = roomService.rooms;
const isLoading = roomService.isLoading;
const friends = getFriends();

const isCreateModalOpen = ref(false);
const isCreating = ref(false);
const newRoomName = ref('');
const searchQuery = ref('');
const selectedFriends = ref<string[]>([]);

const filteredFriends = computed(() => {
  let list = friends.value;
  if (searchQuery.value) {
    list = list.filter(f => f.toLowerCase().includes(searchQuery.value.toLowerCase()));
  }
  return list.slice(0, 20);
});

let unsubscribeRooms: any = null;

onMounted(() => {
  unsubscribeRooms = roomService.fetchRooms();
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
    
    if (roomId) {
      router.push(`/tabs/tab1/room/${roomId}`);
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
  router.push(`/tabs/tab1/room/${room.id}`);
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Long Press & Room Actions
const longPressTimeout = ref<any>(null);
const mutedRooms = ref<string[]>(JSON.parse(localStorage.getItem('muted_rooms') || '[]'));

const isMuted = (roomId: string) => mutedRooms.value.includes(roomId);

const toggleMute = async (roomId: string) => {
  if (isMuted(roomId)) {
    mutedRooms.value = mutedRooms.value.filter(id => id !== roomId);
  } else {
    mutedRooms.value.push(roomId);
  }
  localStorage.setItem('muted_rooms', JSON.stringify(mutedRooms.value));
  
  const toast = await toastController.create({
    message: isMuted(roomId) ? 'Hive muted' : 'Hive unmuted',
    duration: 1500,
    position: 'top',
    color: 'primary'
  });
  await toast.present();
};

const handleTouchStart = (room: any) => {
  longPressTimeout.value = setTimeout(() => {
    presentRoomActions(room);
  }, 600);
};

const handleTouchEnd = () => {
  if (longPressTimeout.value) {
    clearTimeout(longPressTimeout.value);
    longPressTimeout.value = null;
  }
};

const presentRoomActions = async (room: any) => {
  Haptics.impact({ style: ImpactStyle.Heavy });
  const isOwner = room.owner === userBeeId.value;

  const buttons: any[] = [
    {
      text: isMuted(room.id) ? 'UNMUTE HIVE' : 'MUTE HIVE',
      icon: isMuted(room.id) ? volumeHighOutline : volumeMuteOutline,
      handler: () => {
        toggleMute(room.id);
      }
    }
  ];

  if (isOwner) {
    buttons.push({
      text: 'DELETE HIVE',
      role: 'destructive',
      icon: trashOutline,
      handler: () => {
        confirmDeleteRoom(room);
      }
    });
  } else {
    buttons.push({
      text: 'LEAVE HIVE',
      role: 'destructive',
      icon: logOutOutline,
      handler: () => {
        confirmLeaveRoom(room);
      }
    });
  }

  buttons.push({
    text: 'CANCEL',
    role: 'cancel',
    icon: closeOutline
  });

  const actionSheet = await actionSheetController.create({
    header: room.name.toUpperCase(),
    subHeader: isOwner ? 'Hive Manager' : 'Hive Member',
    buttons
  });
  await actionSheet.present();
};

const confirmDeleteRoom = async (room: any) => {
  const alert = await alertController.create({
    header: 'Dissolve Hive?',
    message: `Are you sure you want to delete "${room.name}"? This will remove it for EVERYONE.`,
    buttons: [
      { text: 'CANCEL', role: 'cancel' },
      {
        text: 'DISSOLVE',
        role: 'destructive',
        handler: async () => {
          await roomService.deleteRoom(room.id);
          Haptics.notification({ type: 'success' as any });
        }
      }
    ]
  });
  await alert.present();
};

const confirmLeaveRoom = async (room: any) => {
  const alert = await alertController.create({
    header: 'Leave Hive?',
    message: `Ready to depart from "${room.name}"?`,
    buttons: [
      { text: 'STAY', role: 'cancel' },
      {
        text: 'LEAVE',
        role: 'destructive',
        handler: async () => {
          if (userBeeId.value) {
            await roomService.removeRoomMember(room.id, userBeeId.value);
            Haptics.notification({ type: 'success' as any });
          }
        }
      }
    ]
  });
  await alert.present();
};
</script>

<style scoped>
.hive-hub-component {
  height: 100%;
  overflow-y: auto;
  padding-bottom: 80px;
}

.rooms-container {
  padding: clamp(12px, 4vw, 20px);
  max-width: 600px;
  margin: 0 auto;
}

.anonymous-promo-card {
  margin-bottom: 24px;
  padding: 20px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  background: linear-gradient(135deg, rgba(255, 191, 0, 0.1) 0%, rgba(255, 107, 53, 0.1) 100%);
  border: 1px solid rgba(255, 191, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.anonymous-promo-card:hover {
  transform: translateY(-5px);
  background: linear-gradient(135deg, rgba(255, 191, 0, 0.15) 0%, rgba(255, 107, 53, 0.15) 100%);
  border-color: rgba(255, 191, 0, 0.3);
}

.promo-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.promo-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: #ffbf00;
  color: black;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 0 15px rgba(255, 191, 0, 0.4);
}

.promo-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: white;
}

.promo-text p {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.promo-arrow {
  color: rgba(255, 191, 0, 0.5);
  font-size: 20px;
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
  padding: clamp(20px, 10vw, 40px);
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
  font-size: clamp(1.4rem, 7vw, 2rem);
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

.room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-card {
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.2s;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.room-card:active {
  transform: scale(0.98);
}

.room-card-inner {
  padding: 18px;
  display: flex;
  align-items: center;
}

.room-avatar {
  width: 56px;
  height: 56px;
  margin-right: 16px;
  flex-shrink: 0;
}

.nest-avatar-mini img {
    width: 100%;
    filter: drop-shadow(0 0 8px rgba(255, 191, 0, 0.4));
    mix-blend-mode: screen;
    -webkit-mask-image: radial-gradient(circle, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 70%);
    mask-image: radial-gradient(circle, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 70%);
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
  font-size: 1.1rem;
  font-weight: 800;
}

.room-time {
  font-size: 11px;
  color: #888;
}

.room-preview {
  margin: 4px 0 10px;
  font-size: 13.5px;
  color: #ccc;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 5px;
}

.mute-mini-icon {
  font-size: 14px;
  color: #ffbf00;
  opacity: 0.7;
}

.room-card.is-muted {
  opacity: 0.8;
}

.member-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ion-color-primary);
  font-weight: 700;
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

.create-room-modal {
  --border-radius: 20px 20px 0 0;
}

.modal-header h2 {
  font-weight: 900;
  background: linear-gradient(to right, #ffbf00, #ff8c00);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.buzz-send-btn {
  width: 100%;
  height: 60px;
  background: #ffbf00;
  border: none;
  border-radius: 20px;
  font-weight: 900;
  color: #000;
}

.animate-in {
  animation: slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
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
    font-size: clamp(1.6rem, 8vw, 2.4rem);
    font-weight: 900;
}

.colony-hub-header .highlight {
    color: #ffbf00;
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
}

.blur-blob.yellow { background: #ffbf00; top: 10%; left: -100px; }
.blur-blob.orange { background: #ff6b35; bottom: 20%; right: -100px; }

.fun-fab {
  margin-bottom: 80px; /* Adjust to sit above tabs */
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.fun-fab:active {
  transform: scale(0.9) rotate(-10deg);
}
</style>
