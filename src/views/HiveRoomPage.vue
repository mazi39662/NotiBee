<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="room-toolbar">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="chevronBackOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>
          <div class="header-title">
            <span class="room-icon">🍯</span>
            {{ room?.name || 'Hive Room' }}
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <!-- <ion-button @click="isStoryModalOpen = true">
            <ion-icon :icon="cameraOutline" slot="icon-only"></ion-icon>
          </ion-button> -->
          <ion-button @click="isMembersModalOpen = true">
            <ion-icon :icon="informationCircleOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="hive-room-content" ref="contentRef" :scroll-y="false">
      <!-- Dynamic Hive Area -->
      <div class="hive-container">
        <div class="nectar-bg-overlay"></div>
        <!-- Center Nest -->
        <div 
          class="nest-background animate-in" 
          :class="{ 'shaking': isShaking }"
          @click="handleNestClick"
        >
          <div class="nest-glow"></div>
          <img src="/assets/nest.png" class="nest-img-blended" />
        </div>

        <!-- Flying Members -->
        <div 
          v-for="bee in beeStates" 
          :key="bee.beeId" 
          :class="['flying-bee', { 'is-me': bee.beeId === userBeeId, 'bee-emerge': bee.isEmerging, 'dragging': bee.isDragging }]"
          :style="{
            transform: `translate3d(${bee.x}px, ${bee.y}px, 0) translate(-50%, -50%) scale(${dynamicBeeScale})`,
            transition: bee.isDragging ? 'none' : (bee.speed === 0 ? 'none' : `transform ${bee.speed}ms linear`),
            '--bee-scale': dynamicBeeScale,
            'z-index': bee.isDragging ? 1000 : 1
          }"
          @mousedown="onDragStart($event, bee)"
          @touchstart="onDragStart($event, bee)"
          @click="handleBeeClick(bee)"
        >
          <div class="bee-wrapper">
            <transition name="pop">
              <div v-if="bee.lastMessage" class="buzz-bubble">
                <p>{{ truncateMessage(bee.lastMessage) }}</p>
              </div>
            </transition>

            <div :class="['bee-icon', { 'bee-juicy': bee.lastMessage }]">
              <BeeComposite 
                class="bee-icon-composite"
                :customization="bee.customization" 
                :animated="true" 
                :scale="0.3"
                :flipped="bee.isFlipped"
              />
              <div class="bee-name-tag">
                <span v-if="bee.beeId !== userBeeId" :class="['status-dot', { online: bee.isOnline }]"></span>
                {{ bee.beeId === userBeeId ? 'YOU' : bee.beeId }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Swipeable Conversation Drawer -->
      <ion-modal 
        :is-open="true" 
        :initial-breakpoint="0.1" 
        :breakpoints="[0.1, 1]"
        class="chat-drawer-modal"
        :backdrop-breakpoint="0.5"
        handle-behavior="cycle"
        @didDismiss="keepModalOpen"
        @ionBreakpointDidChange="handleBreakpointChange"
      >
        <div class="drawer-wrapper">
          <div class="drawer-header">
            <div class="drag-handle"></div>
            <div class="drawer-info">
              <span class="room-label">HIVE HUB</span>
              <h3>{{ room?.name }}</h3>
              <!-- <p>{{ currentRoomBuzzes.length }} buzzes in this hive</p> -->
            </div>
            
            <ion-buttons slot="end">
              <ion-button @click="isMembersModalOpen = true" fill="clear">
                <ion-icon :icon="informationCircleOutline" color="primary"></ion-icon>
              </ion-button>
            </ion-buttons>
          </div>

          <div class="drawer-content">
            <!-- Room Stories Area inside Drawer -->
            <div class="stories-well-drawer glass-panel">
              <div class="story-item placeholder" @click="postStory">
                <div class="add-story-circle">
                  <ion-icon :icon="addOutline"></ion-icon>
                </div>
                <span>Nectar</span>
              </div>
              
              <div 
                v-for="(userStories, beeId) in groupedStories" 
                :key="beeId" 
                class="story-item" 
                @click="openUserStories(userStories)"
              >
                <div 
                  class="story-circle-v3 active" 
                  :style="{ 
                    backgroundImage: userStories[0].imageUrl ? `url(${userStories[0].imageUrl})` : 'none',
                    backgroundColor: userStories[0].backgroundColor || 'var(--ion-color-primary)'
                  }"
                >
                  <div v-if="!userStories[0].imageUrl" class="story-text-preview">
                    {{ userStories[0].textContent?.substring(0, 10) }}
                  </div>
                  <div class="story-count-badge" v-if="userStories.length > 1">
                    {{ userStories.length }}
                  </div>
                </div>
                <span>{{ beeId === userBeeId ? 'You' : beeId }}</span>
              </div>
            </div>

            <!-- Buzz History list -->
            <ion-content 
              class="chat-history-scroll" 
              ref="chatScrollRef"
              :scroll-y="true"
              data-ion-no-swipe="true"
              @touchstart="handleChatTouchStart"
              @touchmove="handleChatTouchMove"
            >
              <div class="chat-history-container">
                <div class="chat-spacer"></div>
                <div v-if="currentRoomBuzzes.length === 0" class="empty-chat-v2">
                  <div class="empty-icon-v2">📢</div>
                  <p>Quiet hive... Start the swarm!</p>
                </div>

                <div 
                  v-for="(buzz, idx) in sortedBuzzes" 
                  :key="buzz.id" 
                  :class="[
                    'buzz-bubble-v2', 
                    { 
                      'own-buzz': buzz.sender === userBeeId,
                      'is-first': idx === 0 || sortedBuzzes[idx-1].sender !== buzz.sender,
                      'is-last': idx === sortedBuzzes.length - 1 || sortedBuzzes[idx+1].sender !== buzz.sender,
                      'has-next': idx < sortedBuzzes.length - 1 && sortedBuzzes[idx+1].sender === buzz.sender
                    }
                  ]"
                  @contextmenu.prevent="handleMessageLongPress(buzz, $event)"
                >
                  <div class="buzz-sender-v2" v-if="buzz.sender !== userBeeId && (idx === 0 || sortedBuzzes[idx-1].sender !== buzz.sender)">
                    {{ buzz.sender }}
                  </div>
                  <div class="buzz-content-v2" :class="{ 'has-media': buzz.image || buzz.audioUrl }" @click="handleBuzzClick(buzz, $event)">
                    <img v-if="buzz.image" :src="buzz.image" class="buzz-img-v2" @click.stop="viewFullImage(buzz.image)" @load="scrollToBottom(0)" />
                    <AudioBubble 
                      v-if="buzz.audioUrl" 
                      :src="buzz.audioUrl" 
                      :duration="buzz.duration || 0" 
                      :msgId="buzz.id" 
                      :is-own="buzz.sender === userBeeId" 
                      :customization="getMemberCustomization(buzz.sender)"
                    />
                    <p v-else-if="buzz.message">{{ buzz.message }}</p>
                    
                    <div class="buzz-meta-v2">
                      <span class="buzz-time-v2">{{ formatTime(buzz.timestamp) }}</span>
                      <div class="read-receipt-container" v-if="buzz.sender === userBeeId">
                        <ion-spinner name="crescent" v-if="buzz.status === 'sending'" class="receipt-spinner"></ion-spinner>
                        <ion-icon :icon="checkmarkDoneOutline" v-else-if="buzz.status === 'sent' || !buzz.status" class="read-receipt"></ion-icon>
                        <ion-icon :icon="alertCircleOutline" v-else-if="buzz.status === 'error'" class="error-receipt"></ion-icon>
                      </div>
                    </div>
                    
                    <!-- Reactions Display -->
                    <div v-if="buzz.reactions && Object.keys(buzz.reactions).length > 0" class="reactions-container">
                      <div 
                        v-for="(users, emoji) in buzz.reactions" 
                        :key="emoji" 
                        v-show="users.length > 0"
                        :class="['reaction-pill', { 'reacted': users.includes(userBeeId || '') }]"
                        @click.stop="reactToBuzz(buzz, emoji)"
                      >
                        <span class="emoji">{{ emoji }}</span>
                        <span class="count">{{ users.length }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="scroll-bottom-anchor"></div>
              </div>
            </ion-content>
          </div>

          <div class="drawer-footer">
            <div class="chat-input-row glass-panel gold-glow-mini" v-if="!isRecording">
              <button @click="takePhoto" class="tool-btn">
                <ion-icon :icon="cameraOutline"></ion-icon>
              </button>
              <ion-textarea
                v-model="newMessage"
                placeholder="Message the swarm..."
                :auto-grow="true"
                :rows="1"
                class="drawer-textarea"
                @keyup.enter.prevent="handleSend"
              ></ion-textarea>
              <button @click="startAudioRecording" class="tool-btn mic-btn">
                <ion-icon :icon="micOutline"></ion-icon>
              </button>
              <button @click="handleSend" :disabled="!newMessage.trim() || isSending" class="send-btn">
                <ion-icon :icon="paperPlaneOutline"></ion-icon>
              </button>
            </div>
            <div class="chat-input-row recording-row glass-panel gold-glow-mini vibrate-subtle" v-else>
               <div class="recording-status">
                 <div class="recording-dot"></div>
                 <span class="recording-timer">{{ audioFormatTimeHelper(recordingTime) }} / 0:30</span>
               </div>
               <div class="recording-actions">
                 <button @click="cancelAudioRecording" class="cancel-btn">CANCEL</button>
                 <button @click="sendAudioRecording" class="send-audio-btn">
                   <ion-icon :icon="paperPlaneOutline"></ion-icon>
                 </button>
               </div>
            </div>
          </div>
        </div>
      </ion-modal>

      <!-- Members Info Modal -->
      <ion-modal 
        :is-open="isMembersModalOpen" 
        @didDismiss="isMembersModalOpen = false"
        :initial-breakpoint="0.5"
        :breakpoints="[0, 0.5, 0.8]"
        class="members-modal"
      >
        <div class="modal-wrapper-members glass-panel">
          <div class="modal-header-premium">
            <div class="header-icon-circle">🐝</div>
            <h2>Hive Members</h2>
            <p>The loyal colony of {{ room?.name }}</p>
          </div>
          <div class="modal-body">
            <ion-list lines="none" class="custom-list">
              <ion-item v-for="member in room?.members" :key="member" class="member-item">
                <div class="member-avatar">
                  <BeeComposite 
                    v-if="member"
                    :customization="getMemberCustomization(member)" 
                    :animated="true" 
                    :scale="0.25"
                  />
                  <span v-else>🐝</span>
                </div>
                <ion-label>
                  <h3>{{ member }}</h3>
                  <p v-if="member === room?.owner">Queen Bee</p>
                  <p v-else>Worker Bee</p>
                </ion-label>
                <div slot="end" class="member-actions">
                  <ion-badge color="primary" v-if="member === userBeeId" class="me-badge">YOU</ion-badge>
                  <ion-button 
                    v-if="room?.owner === userBeeId && member !== userBeeId" 
                    fill="clear" 
                    color="danger" 
                    @click="handleRemoveMember(member)"
                  >
                    <ion-icon :icon="trashOutline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </ion-item>
            </ion-list>
            
            <!-- Add Member Section for Owner -->
            <div v-if="room?.owner === userBeeId" class="add-member-section glass-panel">
              <h3>Invigorate the Hive</h3>
              <p>Add a bee by their ID</p>
              <div class="add-input-row">
                <ion-input v-model="newMemberId" placeholder="BEE_ID_123" class="add-input"></ion-input>
                <ion-button @click="handleAddMember" :disabled="!newMemberId">
                  <ion-icon :icon="addOutline" slot="start"></ion-icon>
                  ADD
                </ion-button>
              </div>
            </div>
          </div>
        </div>
      </ion-modal>

      <ion-modal 
        :is-open="isSettingsModalOpen" 
        @didDismiss="isSettingsModalOpen = false"
        :initial-breakpoint="0.5"
        :breakpoints="[0, 0.5, 0.8]"
        class="hive-settings-modal"
      >
        <div class="modal-wrapper-settings glass-panel">
          <div class="modal-header-premium">
            <div class="header-icon-circle">👑</div>
            <h2>Hive Settings</h2>
            <p>Manage your royal chamber</p>
          </div>
          <div class="modal-body">
            <div class="settings-card glass-panel">
              <ion-item lines="none" class="setting-item-premium">
                <ion-label position="stacked">HIVE NOMENCLATURE</ion-label>
                <div class="edit-row-premium">
                  <ion-input v-model="tempRoomName" placeholder="Rename your hive..."></ion-input>
                  <ion-button fill="solid" class="gold-save-btn" @click="handleUpdateName" :disabled="tempRoomName === room?.name">
                    UPDATE
                  </ion-button>
                </div>
              </ion-item>
            </div>

            <div class="danger-zone glass-panel">
              <h3>DANGER ZONE</h3>
              <p>This action cannot be undone.</p>
              <ion-button expand="block" color="danger" fill="outline" class="dissolve-btn" @click="handleDeleteRoom">
                <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                DISSOLVE HIVE
              </ion-button>
            </div>
          </div>
        </div>
      </ion-modal>

      <!-- Room Story Viewer Modal -->
      <ion-modal :is-open="isViewerOpen" @didDismiss="closeViewer" class="story-viewer-modal">
        <div class="story-viewer-v4" v-if="currentStoryGroup.length > 0 && storyIndex < currentStoryGroup.length">
          <!-- Progress Bars -->
          <div class="story-progress-group">
            <div 
              v-for="(s, idx) in currentStoryGroup" 
              :key="s.id" 
              class="story-progress-bar"
            >
              <div 
                class="progress-fill" 
                :class="{ 'active': idx === storyIndex, 'complete': idx < storyIndex }"
              ></div>
            </div>
          </div>

          <!-- Header -->
          <div class="viewer-header">
            <div class="bee-info">
              <span class="bee-avatar">🐝</span>
              <div class="bee-meta">
                <h4>{{ currentStoryGroup[0].beeId }}</h4>
                <p>Nectar from {{ formatTime(currentStoryGroup[storyIndex].createdAt) }}</p>
              </div>
            </div>
            <ion-button fill="clear" color="light" @click="isViewerOpen = false">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </div>

          <!-- Content -->
          <div class="viewer-content" @click="nextStory">
            <template v-if="currentStoryGroup[storyIndex]">
              <img v-if="currentStoryGroup[storyIndex].imageUrl" :src="currentStoryGroup[storyIndex].imageUrl" />
              <div 
                v-else 
                class="text-story-full" 
                :style="{ backgroundColor: currentStoryGroup[storyIndex].backgroundColor || '#ffbf00' }"
              >
                <p>{{ currentStoryGroup[storyIndex].textContent }}</p>
              </div>
            </template>
          </div>

          <!-- Nav Areas -->
          <div class="nav-overlay">
            <div class="nav-prev" @click.stop="prevStory"></div>
            <div class="nav-next" @click.stop="nextStory"></div>
          </div>
        </div>
      </ion-modal>

      <!-- Full Image Viewer -->
      <ion-modal :is-open="!!fullImage" @didDismiss="fullImage = null" class="full-img-modal">
        <div class="full-img-container" @click="fullImage = null">
          <img v-if="fullImage" :src="fullImage" />
          <ion-button fill="clear" color="light" class="close-btn" @click="fullImage = null">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>
      </ion-modal>

      <ion-popover 
        :is-open="isEmojiPickerOpen" 
        :event="emojiPickerEvent"
        @didDismiss="isEmojiPickerOpen = false; if(!confirmingDelete) selectedBuzzForReaction = null"
        class="emoji-picker-popover"
        :show-backdrop="true"
      >
        <div class="emoji-picker-container">
          <div class="emoji-carousel">
            <div 
              v-for="emoji in commonEmojis" 
              :key="emoji" 
              class="emoji-option"
              @click="handleEmojiSelect(emoji)"
            >
              {{ emoji }}
            </div>
          </div>
          <div 
            v-if="selectedBuzzForReaction?.sender === userBeeId" 
            class="emoji-delete-btn" 
            @click="confirmDeleteBuzz"
          >
            <ion-icon :icon="trash"></ion-icon>
          </div>
        </div>
      </ion-popover>


    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, IonIcon, IonButton, IonFooter,
  IonTextarea, IonModal, IonList, IonItem, IonLabel, IonBadge, IonSpinner,
  alertController, actionSheetController, toastController, IonInput,
  IonPopover
} from '@ionic/vue';
import { 
  cameraOutline, paperPlaneOutline, addOutline, chatbubbleOutline, 
  closeOutline, informationCircleOutline, settingsOutline, trashOutline,
  micOutline, stopOutline, checkmarkDoneOutline, alertCircleOutline, trash,
  chevronBackOutline
} from 'ionicons/icons';
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useRoomService } from '@/services/RoomService';
import { useUserService } from '@/services/UserService';
import { useAudioService } from '@/services/AudioService';
import AudioBubble from '@/components/AudioBubble.vue';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useRouter } from 'vue-router';
import BeeComposite from '@/components/BeeComposite.vue';

interface BeeState {
  beeId: string;
  x: number;
  y: number;
  speed: number;
  lastMessage?: string;
  lastMessageId?: string;
  isEmerging?: boolean;
  moveTimeout?: any;
  isOnline?: boolean;
  isDragging?: boolean;
  customization?: { top: string, body: string, eyes: string };
  isFlipped?: boolean;
}

const route = useRoute();
const router = useRouter();
const roomId = route.params.id as string;
const roomService = useRoomService();
const { deleteRoomBuzz } = roomService;
const { userBeeId } = useUserService();

const goBack = () => {
    router.replace('/tabs/tab1?tab=hub');
};
const { 
  isRecording, 
  recordingTime, 
  startRecording, 
  stopRecording, 
  cancelRecording, 
  uploadAudio: uploadAudioFile,
  formatTime: audioFormatTimeHelper
} = useAudioService();

const startAudioRecording = async () => {
    try {
        await Haptics.impact({ style: ImpactStyle.Medium });
        await startRecording();
    } catch (e: any) {
        console.error('Mic access error:', e);
        const toast = await toastController.create({
            message: `Microphone Error: ${e.message || 'Could not access microphone'}`,
            duration: 3000,
            color: 'danger'
        });
        await toast.present();
    }
};

const cancelAudioRecording = async () => {
    await Haptics.selectionStart();
    cancelRecording();
};

const sendAudioRecording = async () => {
    try {
        isSending.value = true;
        const blob = await stopRecording();
        const duration = recordingTime.value;
        
        await Haptics.notification({ type: ImpactStyle.Light as any });
        
        // 1. Upload to storage
        const audioUrl = await uploadAudioFile(blob, userBeeId.value || 'unknown');
        
        // 2. Send to room
        if (room.value?.owner) {
            await roomService.sendRoomAudioBuzz(roomId, audioUrl, duration, room.value.owner);
        }
        
        isSending.value = false;
        await nextTick();
        scrollToBottom();
    } catch (e) {
        console.error('Failed to send audio', e);
        isSending.value = false;
    }
};

const room = computed(() => roomService.rooms.value.find(r => r.id === roomId));
const currentRoomBuzzes = roomService.currentRoomBuzzes;
const currentRoomStories = roomService.currentRoomStories;

const newMessage = ref('');
const memberCustomizations = ref<Record<string, any>>({});
const isSending = ref(false);
const isMembersModalOpen = ref(false);
const isSettingsModalOpen = ref(false);
const isStoryModalOpen = ref(false);
const newMemberId = ref('');
const tempRoomName = ref('');

watch(room, (newVal) => {
  if (newVal && !tempRoomName.value) {
    tempRoomName.value = newVal.name;
  }
}, { immediate: true });
const chatScrollRef = ref<any>(null);

// Story Viewer State
const isViewerOpen = ref(false);
const currentStoryGroup = ref<any[]>([]);
const storyIndex = ref(0);
const viewerTimer = ref<any>(null);

// Full Image State
const fullImage = ref<string | null>(null);

const beeStates = ref<BeeState[]>([]);
const lastNestClick = ref(0);
const isShaking = ref(false);
let animationTimer: any = null;

const commonEmojis = ['❤️', '😂', '😮', '😢', '🔥', '🐝', '👍', '🙏'];
const isEmojiPickerOpen = ref(false);
const emojiPickerEvent = ref<any>(null);
const selectedBuzzForReaction = ref<any>(null);
const confirmingDelete = ref(false);
const activeActionSheet = ref<any>(null);
const assetsLoaded = ref(false);
const customizationsLoaded = ref(false);
const isReadyToShowBees = computed(() => assetsLoaded.value && (customizationsLoaded.value || Object.keys(memberCustomizations.value).length > 0));
const setupBeeTimeouts = ref<any[]>([]);

// Persistent Cache for Member Designs
const CUSTOMIZATION_CACHE_PREFIX = 'bee_custom_cache_';
const loadCustomizationCache = (memberIds: string[]) => {
    memberIds.forEach(id => {
        const cached = localStorage.getItem(CUSTOMIZATION_CACHE_PREFIX + id);
        if (cached) {
            memberCustomizations.value[id] = JSON.parse(cached);
        }
    });
};
const saveCustomizationCache = (id: string, data: any) => {
    localStorage.setItem(CUSTOMIZATION_CACHE_PREFIX + id, JSON.stringify(data));
};

// Dragging Logic
const draggedBee = ref<BeeState | null>(null);
const dragOffset = ref({ x: 0, y: 0 });
const hasDragged = ref(false);
const dragThreshold = 5;

const onDragStart = (e: any, bee: BeeState) => {
    draggedBee.value = bee;
    hasDragged.value = false;
    
    // Clear move timeout while dragging
    if (bee.moveTimeout) clearTimeout(bee.moveTimeout);
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    dragOffset.value = {
        x: clientX - bee.x,
        y: clientY - bee.y
    };
    
    bee.isDragging = true;
};

const onDragMove = (e: any) => {
    if (!draggedBee.value) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    const newX = clientX - dragOffset.value.x;
    const newY = clientY - dragOffset.value.y;
    
    if (!hasDragged.value) {
        const dist = Math.sqrt(Math.pow(newX - draggedBee.value.x, 2) + Math.pow(newY - draggedBee.value.y, 2));
        if (dist > dragThreshold) {
            hasDragged.value = true;
        }
    }
    
    if (hasDragged.value) {
        if (e.cancelable) e.preventDefault();
        draggedBee.value.x = newX;
        draggedBee.value.y = newY;
    }
};

const onDragEnd = () => {
    if (draggedBee.value) {
        draggedBee.value.isDragging = false;
        
        // Resume animation
        const bee = draggedBee.value;
        setTimeout(() => {
            if (!bee.isDragging) {
              animateBees(bee);
            }
        }, 100);
    }
    draggedBee.value = null;
};

const showReactionPicker = (buzz: any, event: any) => {
  selectedBuzzForReaction.value = buzz;
  emojiPickerEvent.value = event;
  isEmojiPickerOpen.value = true;
  Haptics.impact({ style: ImpactStyle.Light });
};

const handleMessageLongPress = async (buzz: any, event: any) => {
    Haptics.impact({ style: ImpactStyle.Medium });
    
    // Show the bubble for reactions and delete option
    showReactionPicker(buzz, event);
};

const confirmDeleteBuzz = async () => {
    if (!selectedBuzzForReaction.value) return;
    confirmingDelete.value = true;
    const msgId = selectedBuzzForReaction.value.id;
    isEmojiPickerOpen.value = false;
    
    const alert = await alertController.create({
        header: 'Delete Message?',
        message: 'This will remove this message from the Hive Room for everyone.',
        buttons: [
            {
                text: 'Cancel', 
                role: 'cancel', 
                handler: () => {
                    confirmingDelete.value = false;
                    selectedBuzzForReaction.value = null;
                }
            },
            { 
                text: 'Delete', 
                handler: async () => {
                   if (room.value?.owner) {
                       await deleteRoomBuzz(roomId, msgId, room.value.owner);
                   }
                   confirmingDelete.value = false;
                   selectedBuzzForReaction.value = null;
                   Haptics.notification({ type: 'success' as any });
                } 
            }
        ]
    });
    await alert.present();
};

const handleEmojiSelect = (emoji: string) => {
  if (selectedBuzzForReaction.value) {
    reactToBuzz(selectedBuzzForReaction.value, emoji);
  }
  isEmojiPickerOpen.value = false;
  if (activeActionSheet.value) {
    activeActionSheet.value.dismiss();
    activeActionSheet.value = null;
  }
};

const reactToBuzz = async (buzz: any, emoji: string) => {
  try {
    if (room.value?.owner) {
        await roomService.reactToBuzz(roomId, buzz.id, emoji, room.value.owner);
    }
    Haptics.impact({ style: ImpactStyle.Light });
  } catch (err) {
    console.error('failed to react', err);
  }
};

const lastBuzzClick = ref<{ id: string, time: number } | null>(null);

const handleBuzzClick = (buzz: any, event: any) => {
  const now = Date.now();
  if (lastBuzzClick.value && lastBuzzClick.value.id === buzz.id && (now - lastBuzzClick.value.time) < 300) {
    // Double tap detected
    reactToBuzz(buzz, '❤️');
    lastBuzzClick.value = null;
  } else {
    lastBuzzClick.value = { id: buzz.id, time: now };
  }
};

const dynamicBeeScale = computed(() => {
  const count = beeStates.value.length || 1;
  if (count <= 3) return 1.5; // Large for small crowds
  if (count <= 8) return 1.2; // Medium-large
  if (count >= 20) return 0.8; // Smaller for big swarms
  return 1.0; // Standard size
});

const getRandomPos = () => {
  const scale = dynamicBeeScale.value;
  const padding = 60 * scale;
  return {
    x: Math.random() * (window.innerWidth - (padding * 2)) + padding,
    y: Math.random() * (window.innerHeight - 300) + 80
  };
};

const getHolePos = () => ({
  x: window.innerWidth / 2, // Center x
  y: window.innerHeight * 0.55 // Center y for simpler dragging logic initially or keep room specific
});

const animateBees = (bee: BeeState, isInitial = false) => {
    const pos = getRandomPos();
    // Flip logic: if new X is less than current X, it's moving left
    bee.isFlipped = pos.x < bee.x;

    bee.x = pos.x;
    bee.y = pos.y;
    // High-energy speeds: 1s to 3s
    bee.speed = isInitial ? (800 + Math.random() * 1000) : (1500 + Math.random() * 2000);
    
    // Clear any existing timeout for this specific bee
    if (bee.moveTimeout) clearTimeout(bee.moveTimeout);
    
    // Schedule next move immediately after this one ends to ensure NO pauses
    bee.moveTimeout = setTimeout(() => {
        // Only continue if the bee is still in our state (prevent ghost loops)
        const currentBee = beeStates.value.find(b => b.beeId === bee.beeId);
        if (currentBee) animateBees(currentBee);
    }, bee.speed);
};

const setupBees = () => {
    if (!room.value || !isReadyToShowBees.value) return;
    
    // 1. Clear any pending setup timeouts to prevent duplication
    setupBeeTimeouts.value.forEach(t => clearTimeout(t));
    setupBeeTimeouts.value = [];

    // 2. Clear current states if we are re-syncing
    beeStates.value = [];

    const members = room.value.members || [];
    const hole = getHolePos();

    // Staggered emergence with grow effect
    members.forEach((id, index) => {
        const t = setTimeout(() => {
            // Final check: don't add if already exists (safeguard)
            if (beeStates.value.some(b => b.beeId === id)) return;

            const newBee: BeeState = {
                beeId: id,
                x: hole.x,
                y: hole.y,
                speed: 0,
                isEmerging: true,
                isOnline: id === userBeeId.value, // Default self to online
                customization: memberCustomizations.value[id]
            };
            beeStates.value.push(newBee);
            
            // Initial pause at the hole, then enter constant loop
            const moveT = setTimeout(() => {
                animateBees(newBee, true);
                
                // Clear emergence state once movement starts
                setTimeout(() => {
                    newBee.isEmerging = false;
                }, 1000);
            }, 500);
            setupBeeTimeouts.value.push(moveT);

        }, index * 400); // Faster staggered entry
        setupBeeTimeouts.value.push(t);
    });
};

let unsubscribeBuzzes: any = null;
let unsubscribeStories: any = null;
let colonyUnsubscribe: (() => void) | null = null;

const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastActive = new Date(lastSeen).getTime();
    const now = Date.now();
    return (now - lastActive) < 1000 * 60 * 1; // Online if seen in last 1 min
};

// Sync member status
watch(room, (newRoom) => {
    if (newRoom && newRoom.members?.length > 0) {
        // Load initial cache for immediate visual design
        loadCustomizationCache(newRoom.members);
        
        if (colonyUnsubscribe) colonyUnsubscribe();
        const { members: userDocs, unsubscribe } = useUserService().getColonyMembers(newRoom.members);
        colonyUnsubscribe = unsubscribe;
        
        watch(userDocs, (data) => {
            data.forEach(m => {
                // Update member customizations map
                if (m.beeId) {
                    const data = m.customization || { top: 'none', body: 'none', eyes: 'none' };
                    memberCustomizations.value[m.beeId] = data;
                    saveCustomizationCache(m.beeId, data);
                }

                const bee = beeStates.value.find(b => b.beeId === m.beeId);
                if (bee) {
                    bee.isOnline = isOnline(m.lastSeen);
                    if (m.customization) bee.customization = m.customization;
                }
            });
            // Mark customizations as loaded once we have data for all members
            // to ensure no "default" bees emerge.
            if (data.length >= newRoom.members.length) {
                customizationsLoaded.value = true;
            }
        }, { immediate: true });
    }
}, { immediate: true });

const getMemberCustomization = (memberId: string) => {
  return memberCustomizations.value[memberId] || { top: 'none', body: 'none', eyes: 'none' };
};

const sortedBuzzes = computed(() => {
  return [...currentRoomBuzzes.value].sort((a, b) => a.timestamp - b.timestamp);
});

const groupedStories = computed(() => {
  const groups: Record<string, any[]> = {};
  currentRoomStories.value.forEach(story => {
    if (!groups[story.beeId]) {
      groups[story.beeId] = [];
    }
    groups[story.beeId].push(story);
  });
  
  // Sort user groups: Mine first, then by latest story
  const sortedUserIds = Object.keys(groups).sort((a, b) => {
    if (a === userBeeId.value) return -1;
    if (b === userBeeId.value) return 1;
    const latestA = Math.max(...groups[a].map(s => s.createdAt));
    const latestB = Math.max(...groups[b].map(s => s.createdAt));
    return latestB - latestA;
  });

  const sortedGroups: Record<string, any[]> = {};
  sortedUserIds.forEach(id => {
    sortedGroups[id] = groups[id].sort((a, b) => a.createdAt - b.createdAt);
  });
  
  return sortedGroups;
});

const keepModalOpen = () => {
    // Keep conversation drawer alive
};

const preloadBeeAssets = () => {
    const eyeAssets = [
        'angry', 'crying', 'dizzy', 'eh', 'hehe', 'hehehe', 
        'kawaii', 'meh', 'nonchalant', 'shock', 'smiley', 
        'square_eye', 'what', 'x_eye'
    ].map(eye => `/assets/bee assets/eyes/${eye}.png`);

    const assets = [
        '/assets/bee assets/wing_right.png',
        '/assets/bee assets/wing_left.png',
        '/assets/bee assets/bee_body.png',
        '/assets/bee assets/bee_eyes.png',
        '/assets/bee assets/eyeglass.png',
        '/assets/bee assets/shades.png',
        '/assets/bee assets/hat.png',
        '/assets/bee assets/cowboyhat.png',
        '/assets/bee assets/strawhat.png',
        '/assets/bee assets/crown.png',
        ...eyeAssets
    ];
    
    const promises = assets.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = resolve;
            img.onerror = resolve; // Continue even on error
        });
    });
    
    return Promise.all(promises);
};

onMounted(async () => {
  const startTime = Date.now();
  
  roomService.fetchRooms();
  // room is a computed so it might not be ready yet
  watch(room, (newVal) => {
    if (newVal && newVal.owner && !unsubscribeBuzzes) {
      unsubscribeBuzzes = roomService.initRoomBuzzListener(roomId, newVal.owner);
      unsubscribeStories = roomService.fetchRoomStories(roomId, newVal.owner);
    }
  }, { immediate: true });
  
  // setupBees() will be called when showSplash becomes false
  scrollToBottom();

  // Preload assets
  await preloadBeeAssets();
  assetsLoaded.value = true;
  
  // Add global move listeners for dragging
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('touchend', onDragEnd);
});

onUnmounted(() => {
  if (unsubscribeBuzzes) unsubscribeBuzzes();
  if (unsubscribeStories) unsubscribeStories();
  // Cleanup all bee loops and setup timeouts
  beeStates.value.forEach(bee => {
    if (bee.moveTimeout) clearTimeout(bee.moveTimeout);
  });
  setupBeeTimeouts.value.forEach(t => clearTimeout(t));
  
  if (colonyUnsubscribe) colonyUnsubscribe();

  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
  window.removeEventListener('touchmove', onDragMove);
  window.removeEventListener('touchend', onDragEnd);
});

watch(room, (newRoom) => {
    if (newRoom && beeStates.value.length === 0 && isReadyToShowBees.value) {
        setupBees();
    }
});

watch(isReadyToShowBees, (ready) => {
    if (ready) {
        setupBees();
    }
});

watch(() => currentRoomBuzzes.value.length, () => {
  scrollToBottom();

  if (currentRoomBuzzes.value && currentRoomBuzzes.value.length > 0) {
      const latest = currentRoomBuzzes.value[0]; 
      const messageAge = Date.now() - latest.timestamp;
      
      if (messageAge < 5000) {
          // Trigger shake if message is "shakes the hive!"
          if (latest.message && latest.message.includes('shakes the hive!')) {
              triggerLocalShake();
          }

          const bee = beeStates.value.find(b => b.beeId === latest.sender);
          if (bee) {
              bee.lastMessage = latest.message;
              bee.lastMessageId = latest.id;
              setTimeout(() => {
                  if (bee.lastMessageId === latest.id) {
                      bee.lastMessage = undefined;
                  }
              }, 15000);
          }
      }
  }
});

const scrollToBottom = async (duration = 300) => {
  await nextTick();
  await nextTick();
  
  const effort = async (d: number) => {
    if (chatScrollRef.value) {
      const content = chatScrollRef.value;
      try {
        // 1. Try Ionic scrollToBottom first
        if (typeof content.scrollToBottom === 'function') {
          await content.scrollToBottom(d);
        } else if (content.$el && typeof content.$el.scrollToBottom === 'function') {
          await content.$el.scrollToBottom(d);
        } else {
          // 2. Fallback to manual scroll on the element
          const el = await content.getScrollElement();
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        }
      } catch (err) {
        // Silently fail if elements are not ready
      }
    }
  };

  // 1. Initial attempt
  await effort(duration);
  
  // 2. Persistent retries for modal/rendering delay
  [50, 150, 300, 500, 800, 1200].forEach(delay => {
    setTimeout(() => effort(delay < 400 ? 0 : duration), delay);
  });
};

const handleBreakpointChange = (ev: any) => {
    // If expanded, ensure we scroll to latest
    if (ev.detail.breakpoint >= 0.45) {
        scrollToBottom(0);
    }
};

// Prevent modal from closing when scrolling chat
const handleChatTouchStart = (e: TouchEvent) => {
  // Store the initial touch position to determine scroll direction
  const target = e.currentTarget as HTMLElement;
  if (target) {
    (target as any)._touchStartY = e.touches[0].clientY;
    (target as any)._scrollTop = target.scrollTop;
  }
};

const handleChatTouchMove = (e: TouchEvent) => {
  const target = e.currentTarget as HTMLElement;
  if (!target) return;

  const touchY = e.touches[0].clientY;
  const touchStartY = (target as any)._touchStartY || touchY;
  const scrollTop = target.scrollTop;
  const scrollHeight = target.scrollHeight;
  const clientHeight = target.clientHeight;
  
  const deltaY = touchStartY - touchY;
  const isScrollingDown = deltaY > 0;
  const isScrollingUp = deltaY < 0;
  
  // Prevent modal gesture if:
  // 1. User is scrolling down and not at the top
  // 2. User is scrolling up and not at the bottom
  const canScrollDown = scrollTop < scrollHeight - clientHeight - 1;
  const canScrollUp = scrollTop > 1;
  
  if ((isScrollingDown && canScrollDown) || (isScrollingUp && canScrollUp)) {
    e.stopPropagation();
  }
};

const truncateMessage = (msg: string) => msg.length > 30 ? msg.substring(0, 27) + '...' : msg;

const handleBeeClick = (bee: BeeState) => {
    Haptics.impact({ style: ImpactStyle.Light });
    // Maybe show a quick-talk option?
};

const handleNestClick = () => {
  const now = Date.now();
  if (now - lastNestClick.value < 300) {
    shakeHive();
  }
  lastNestClick.value = now;
};

const shakeHive = async () => {
  if (isShaking.value) return;
  
  // Instant local effect
  triggerLocalShake();
  
  try {
    const msg = `${userBeeId.value} shakes the hive! 🍯💨`;
    if (room.value?.owner) {
        await roomService.sendRoomBuzz(roomId, msg, room.value.owner);
    }
  } catch (error) {
    console.error('Failed to shake hive', error);
  }
};

const triggerLocalShake = () => {
  if (isShaking.value) return;
  isShaking.value = true;
  Haptics.impact({ style: ImpactStyle.Medium });
  setTimeout(() => {
    isShaking.value = false;
  }, 1000);
};

const handleSend = async () => {
  if (!newMessage.value.trim()) return;

  const msg = newMessage.value;
  newMessage.value = '';
  
  // Optimistic UI update
  const temporaryId = 'temp-' + Date.now();
  currentRoomBuzzes.value.push({
    id: temporaryId,
    sender: userBeeId.value || 'You',
    message: msg,
    timestamp: Date.now(),
    reactions: {},
    status: 'sending'
  } as any);

  // Refocus input immediately to keep keyboard open
  nextTick(() => {
    const textarea = document.querySelector('.drawer-textarea textarea') as HTMLTextAreaElement;
    if (textarea) textarea.focus();
  });

  try {
    if (room.value?.owner) {
        await roomService.sendRoomBuzz(roomId, msg, room.value.owner);
    }
    
    // Update the optimistic buzz to "sent"
    const buzz = currentRoomBuzzes.value.find(b => b.id === temporaryId);
    if (buzz) {
      buzz.status = 'sent';
    }
    
    Haptics.impact({ style: ImpactStyle.Light });
    scrollToBottom();
  } catch (error) {
    const buzz = currentRoomBuzzes.value.find(b => b.id === temporaryId);
    if (buzz) {
      buzz.status = 'error';
    }
    console.error('Failed to send room buzz', error);
  }
};

const takePhoto = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 70,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt
    });

    if (image.dataUrl) {
      const alert = await alertController.create({
        header: 'Send Image Buzz?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'SEND',
            handler: async () => {
              isSending.value = true;
              if (room.value?.owner) {
                await roomService.sendRoomBuzz(roomId, 'Photo Buzz! 📸', room.value.owner, image.dataUrl);
              }
              isSending.value = false;
              Haptics.impact({ style: ImpactStyle.Medium });
            }
          }
        ]
      });
      await alert.present();
    }
  } catch (error) {
  }
};

const postStory = async () => {
  const actionSheet = await actionSheetController.create({
    header: 'Room Nectar',
    buttons: [
      {
        text: 'Post Text Story',
        handler: async () => {
          const alert = await alertController.create({
            header: 'What\'s the nectar?',
            inputs: [
              {
                name: 'text',
                type: 'textarea',
                placeholder: 'Type something sweet...'
              }
            ],
            buttons: [
              { text: 'Cancel', role: 'cancel' },
              {
                text: 'POST',
                handler: async (data) => {
                  if (data.text && room.value?.owner) {
                    await roomService.postRoomStory(roomId, room.value.owner, {
                      textContent: data.text,
                      backgroundColor: '#ffbf00'
                    });
                    Haptics.impact({ style: ImpactStyle.Heavy });
                  }
                }
              }
            ]
          });
          await alert.present();
        }
      },
      {
        text: 'Post Photo Story',
        handler: async () => {
          const image = await Camera.getPhoto({
            quality: 70,
            allowEditing: true,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera
          });
          if (image.dataUrl && room.value?.owner) {
            await roomService.postRoomStory(roomId, room.value.owner, {
              imageUrl: image.dataUrl
            });
            Haptics.impact({ style: ImpactStyle.Heavy });
          }
        }
      },
      {
        text: 'Cancel',
        role: 'cancel'
      }
    ]
  });
  await actionSheet.present();
};

const openUserStories = (stories: any[]) => {
  currentStoryGroup.value = stories;
  storyIndex.value = 0;
  isViewerOpen.value = true;
  
  if (stories.length > 0 && room.value?.owner) {
    roomService.markRoomStoryAsViewed(roomId, room.value.owner, stories[0].id);
  }
  
  startStoryTimer();
};

const closeViewer = () => {
  if (viewerTimer.value) clearTimeout(viewerTimer.value);
  isViewerOpen.value = false;
  // Note: we don't clear currentStoryGroup here to avoid reactive crashes while the modal is animating out
};

const nextStory = () => {
    if (storyIndex.value < currentStoryGroup.value.length - 1) {
        storyIndex.value++;
        
        const currentStory = currentStoryGroup.value[storyIndex.value];
        if (currentStory && room.value?.owner) {
            roomService.markRoomStoryAsViewed(roomId, room.value.owner, currentStory.id);
        }
        
        startStoryTimer();
    } else {
        isViewerOpen.value = false;
    }
};

const prevStory = () => {
    if (storyIndex.value > 0) {
        storyIndex.value--;
        startStoryTimer();
    }
};

const startStoryTimer = () => {
    if (viewerTimer.value) clearTimeout(viewerTimer.value);
    // Auto advance after 5s
    viewerTimer.value = setTimeout(() => {
        if (isViewerOpen.value) nextStory();
    }, 5000);
};

const viewFullImage = (url: string) => {
    fullImage.value = url;
};

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Room Management
const handleUpdateName = async () => {
    if (!tempRoomName.value.trim() || tempRoomName.value === room.value?.name) return;
    try {
        await roomService.updateRoomName(roomId, tempRoomName.value.trim());
        const toast = await toastController.create({
            message: 'Hive name updated 🍯',
            duration: 2000,
            color: 'success'
        });
        await toast.present();
    } catch (e) {
        console.error(e);
    }
};

const handleDeleteRoom = async () => {
    const alert = await alertController.create({
        header: 'Dissolve Hive?',
        message: 'Are you sure? This will remove all bees and buzzes from this chamber forever.',
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            {
                text: 'DISSOLVE',
                role: 'destructive',
                handler: async () => {
                    try {
                        await roomService.deleteRoom(roomId);
                        isSettingsModalOpen.value = false;
                        router.replace('/tabs/tab2');
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        ]
    });
    await alert.present();
};

const handleAddMember = async () => {
    if (!newMemberId.value.trim()) return;
    const idToAdd = newMemberId.value.trim();
    
    // Check if already in
    if (room.value?.members.includes(idToAdd)) {
        const toast = await toastController.create({
            message: 'Bee is already in this Hive!',
            duration: 2000,
            color: 'warning'
        });
        await toast.present();
        return;
    }

    try {
        await roomService.addRoomMember(roomId, idToAdd);
        newMemberId.value = '';
        Haptics.notification({ type: 'success' as any });
    } catch (e) {
        console.error(e);
    }
};

const handleRemoveMember = async (memberId: string) => {
    const alert = await alertController.create({
        header: 'Remove Bee?',
        message: `Banish ${memberId} from this Hive?`,
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            {
                text: 'REMOVE',
                role: 'destructive',
                handler: async () => {
                    try {
                        await roomService.removeRoomMember(roomId, memberId);
                        Haptics.impact({ style: ImpactStyle.Medium });
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        ]
    });
    await alert.present();
};
</script>

<style scoped>
.hive-room-content {
  --background: #1a1a2e;
}

.room-toolbar {
    --background: rgb(0, 0, 0);
    --border-style: none;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 191, 0, 0.1);
}

.header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    color: #ffbf00;
}

.room-icon {
    font-size: 20px;
}

.hive-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%);
}

.nectar-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(255, 191, 0, 0.08), transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 107, 0, 0.05), transparent 50%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%23ffbf00' stroke-opacity='0.08' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 100% 100%, 100% 100%, 56px 100px;
  background-repeat: no-repeat, no-repeat, repeat;
  pointer-events: none;
  z-index: 0;
}

.nest-background {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  width: clamp(180px, 50vw, 250px);
  height: clamp(180px, 50vw, 250px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.nest-background:active {
  transform: translate(-50%, -60%) scale(0.95);
}

.nest-background.shaking {
  animation: nest-shake 0.4s cubic-bezier(.36,.07,.19,.97) both infinite;
}

@keyframes nest-shake {
  10%, 90% { transform: translate3d(-50%, -60%, 0) translate3d(-2px, 0, 0) rotate(-1deg); }
  20%, 80% { transform: translate3d(-50%, -60%, 0) translate3d(4px, 0, 0) rotate(2deg); }
  30%, 50%, 70% { transform: translate3d(-50%, -60%, 0) translate3d(-8px, 0, 0) rotate(-3deg); }
  40%, 60% { transform: translate3d(-50%, -60%, 0) translate3d(8px, 0, 0) rotate(3deg); }
}

.nest-img-blended {
  width: 100%;
  height: auto;
  z-index: 2;
  filter: drop-shadow(0 0 35px rgba(255, 191, 0, 0.4)) contrast(1.1) brightness(1.1);
  mix-blend-mode: screen; 
  /* Aggressively mask the edges to remove any non-black box remnants */
  -webkit-mask-image: radial-gradient(circle, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%);
  mask-image: radial-gradient(circle, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%);
}

.nest-glow {
  position: absolute;
  width: 150px;
  height: 150px;
  background: #ffbf00;
  filter: blur(80px);
  opacity: 0.2;
  z-index: 1;
}

/* Flying Bees */
.flying-bee {
  position: absolute;
  z-index: 10;
  will-change: transform;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  animation: bee-fade-in 0.8s ease-out forwards;
}

@keyframes bee-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.bee-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bee-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* Growth animation for emergence */
.bee-emerge .bee-wrapper {
  animation: bee-burst-grow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes bee-burst-grow {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.bee-icon .emoji {
  font-size: 28px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  animation: flap 0.2s ease-in-out infinite alternate;
  will-change: transform;
}

@keyframes flap {
  from { transform: rotate(-5deg) scale(1); }
  to { transform: rotate(5deg) scale(1.05); }
}

.bee-name-tag {
  font-size: 10px;
  font-weight: 900;
  color: white;
  background: rgba(0,0,0,0.4);
  padding: 2px 10px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  transform: scale(calc(1 / var(--bee-scale)));
  transform-origin: center;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #666;
  box-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.status-dot.online {
  background: #2dd36f;
  box-shadow: 0 0 8px rgba(45, 211, 111, 0.6);
}

/* Buzz Bubble */
.buzz-bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  color: black;
  padding: 4px 6px;
  border-radius: 10px;
  margin-bottom: 6px;
  width: 80px;
  white-space: normal;
  text-align: center;
  box-shadow: 0 4px 15px rgba(255, 191, 0, 0.4);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  line-height: 1.1;
  transform: translateX(-50%) scale(calc(1 / var(--bee-scale)));
  transform-origin: bottom center;
}

.buzz-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: white transparent transparent transparent;
}

.buzz-bubble p {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  color: #000;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* Animations */
.pop-enter-active {
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-leave-active {
  animation: pop-in 0.3s reverse ease-in;
}

@keyframes pop-in {
  0% { transform: translateX(-50%) scale(0) translateY(10px); opacity: 0; }
  100% { transform: translateX(-50%) scale(calc(1 / var(--bee-scale))) translateY(0); opacity: 1; }
}

/* Drawer Styling */
.chat-drawer-modal {
    --background: transparent;
    --box-shadow: none;
}

.drawer-wrapper {
  background: transparent;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 30px 30px 0 0;
  border: 1px solid rgba(255, 191, 0, 0.2);
  border-bottom: none;
}

.drawer-header {
  padding: 8px 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.89);
}

.drag-handle {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.drawer-info h3 {
  margin: 0;
  font-size: clamp(1rem, 5vw, 1.2rem);
  font-weight: 900;
  color: #ffbf00;
}

.room-label {
    font-size: 9px;
    font-weight: 900;
    color: rgba(255, 191, 0, 0.5);
    letter-spacing: 1.5px;
}

.drawer-info p {
  margin: 0;
  font-size: 12px;
  color: #888;
}

.drawer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  touch-action: pan-y;
}

.stories-well-drawer {
    display: flex;
    gap: 15px;
    padding: 15px;
    overflow-x: auto;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.story-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 60px;
}

.story-item span {
    font-size: 10px;
    font-weight: 600;
    color: #666;
}

.add-story-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1px dashed #444;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
}

.story-circle-v3 {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid #ffbf00;
    padding: 3px;
    background-size: cover;
    background-position: center;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.story-text-preview {
    font-size: 8px;
    color: white;
    text-align: center;
    font-weight: 800;
    line-height: 1.1;
    padding: 2px;
}

.story-count-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.6);
    color: #ffbf00;
    font-size: 14px;
    font-weight: 900;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 191, 0, 0.3);
}

.chat-history-scroll {
    flex: 1;
    --background: transparent;
    height: 100%;
}

.chat-history-container {
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-height: 100%;
}

.chat-spacer {
  flex: 1 1 auto;
}

.buzz-bubble-v2 {
    max-width: 80%;
    align-self: flex-start;
    margin-bottom: 0px;
    transition: all 0.3s ease;
}

.buzz-bubble-v2.is-last {
    margin-bottom: 12px;
}

.own-buzz {
    align-self: flex-end;
}

.buzz-sender-v2 {
    font-size: 11px;
    font-weight: 800;
    color: rgba(255, 191, 0, 0.8);
    margin-left: 14px;
    margin-bottom: 4px;
    margin-top: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.buzz-content-v2 {
    background: var(--glass-background);
    backdrop-filter: var(--glass-blur-heavy);
    -webkit-backdrop-filter: var(--glass-blur-heavy);
    padding: 10px 14px;
    border-radius: 18px;
    border: 1px solid var(--glass-border);
    position: relative;
    background: rgba(32, 30, 19, 0.658);
}

/* Grouping Logic for Others */
.buzz-bubble-v2:not(.own-buzz).is-first .buzz-content-v2 { border-bottom-left-radius: 4px; }
.buzz-bubble-v2:not(.own-buzz).has-next .buzz-content-v2 { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
.buzz-bubble-v2:not(.own-buzz).is-last:not(.is-first) .buzz-content-v2 { border-top-left-radius: 4px; border-bottom-left-radius: 18px; }

/* Grouping Logic for Own */
.own-buzz.is-first .buzz-content-v2 { border-bottom-right-radius: 4px; }
.own-buzz.has-next .buzz-content-v2 { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
.own-buzz.is-last:not(.is-first) .buzz-content-v2 { border-top-right-radius: 4px; border-bottom-right-radius: 18px; }

.own-buzz .buzz-content-v2 {
    background: linear-gradient(135deg, #ffbf00, #ff9d00);
    border: none;
    box-shadow: 0 4px 12px rgba(255, 191, 0, 0.2);
}

.buzz-content-v2.has-media {
    padding: 6px;
    background: rgba(32, 30, 19, 0.658);
}

.own-buzz .buzz-content-v2.has-media {
    background: rgba(0, 0, 0, 0.1);
}

.buzz-content-v2 p {
    margin: 0;
    font-size: clamp(0.85rem, 4vw, 0.95rem);
    line-height: 1.4;
    color: #efefef;
}

.own-buzz .buzz-content-v2 p {
    color: #000;
    font-weight: 500;
}

.buzz-meta-v2 {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 4px;
}

.buzz-time-v2 {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    font-weight: 500;
}

.own-buzz .buzz-time-v2 {
    color: rgba(0, 0, 0, 0.4);
}

.read-receipt-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 12px;
}

.read-receipt {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.4);
}

.receipt-spinner {
  width: 12px;
  height: 12px;
  --color: rgba(0, 0, 0, 0.4);
}

.error-receipt {
  font-size: 13px;
  color: #e53935;
}

.buzz-img-v2 {
    width: 100%;
    border-radius: 12px;
    margin-bottom: 8px;
}

.drawer-footer {
    background: rgba(0, 0, 0, 0.89);
    padding: 15px 15px min(30px, env(safe-area-inset-bottom) + 15px);
}

.chat-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 25px;
  padding: 6px 12px;
  transition: all 0.3s ease;
}

.recording-row {
  background: rgba(211, 47, 47, 0.1);
  border: 1px solid rgba(211, 47, 47, 0.3);
  justify-content: space-between;
}

.recording-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recording-dot {
  width: 10px;
  height: 10px;
  background: #d32f2f;
  border-radius: 50%;
  animation: pulse-red 1s infinite;
}

@keyframes pulse-red {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

.recording-timer {
  color: #fff;
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
}

.recording-actions {
  display: flex;
  gap: 12px;
}

.cancel-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  border: none;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
}

.send-audio-btn {
  background: #ffbf00;
  color: #000;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(255, 191, 0, 0.3);
}

.drawer-textarea {
    --background: transparent;
    --color: white;
    font-size: 14px;
}

.tool-btn, .send-btn {
    background: transparent;
    border: none;
    padding: 8px;
    color: #ffbf00;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    -webkit-tap-highlight-color: transparent;
}

.mic-btn {
  font-size: 22px;
}

.send-btn:disabled {
    opacity: 0.3;
}

/* Professional Hive Modals */
.members-modal, .hive-settings-modal {
    --background: transparent;
    --box-shadow: none;
}

.modal-wrapper-members, .modal-wrapper-settings {
    height: 100%;
    background: rgba(10, 10, 10, 0.8) !important;
    backdrop-filter: blur(40px) saturate(1.5) !important;
    -webkit-backdrop-filter: blur(40px) saturate(1.5) !important;
    border: 1px solid rgba(255, 191, 0, 0.1);
    border-top: 1px solid rgba(255, 191, 0, 0.3);
    border-radius: 32px 32px 0 0;
    padding: 30px 24px;
    display: flex;
    flex-direction: column;
}

.modal-header-premium {
    text-align: center;
    margin-bottom: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.header-icon-circle {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, rgba(255, 191, 0, 0.2), rgba(255, 107, 0, 0.1));
    border: 1px solid rgba(255, 191, 0, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    box-shadow: 0 0 20px rgba(255, 191, 0, 0.1);
}

.modal-header-premium h2 {
    margin: 0;
    font-size: 26px;
    font-weight: 900;
    background: linear-gradient(135deg, #ffbf00, #ff8c00);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
}

.modal-header-premium p {
    margin: 0;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    font-weight: 500;
}

.member-item {
    --background: rgba(255, 255, 255, 0.03);
    --border-radius: 16px;
    --padding-start: 12px;
    margin-bottom: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
}

.member-avatar {
    width: 44px;
    height: 44px;
    background: linear-gradient(45deg, rgba(255, 191, 0, 0.15), rgba(255, 191, 0, 0.05));
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-right: 16px;
    border: 1px solid rgba(255, 191, 0, 0.2);
}

.member-item h3 {
    font-weight: 700 !important;
    font-size: 16px !important;
}

.member-item p {
    font-size: 11px !important;
    font-weight: 600 !important;
    color: rgba(255, 191, 0, 0.6) !important;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.add-member-section {
    margin-top: 24px;
    padding: 20px;
    background: rgba(255, 191, 0, 0.03) !important;
    border: 1px solid rgba(255, 191, 0, 0.1) !important;
    border-radius: 20px !important;
}

.add-member-section h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 900;
    color: #ffbf00;
    letter-spacing: 0.5px;
}

.add-input-row {
    margin-top: 15px;
    display: flex;
    gap: 10px;
}

.add-input {
    background: rgba(0, 0, 0, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    --padding-start: 15px;
    font-weight: 600;
}

.add-input-row ion-button {
    --background: var(--ion-color-primary);
    --color: black;
    --border-radius: 12px;
    --box-shadow: 0 4px 15px rgba(255, 191, 0, 0.3);
    font-weight: 800;
    margin: 0;
}

/* Settings Card */
.settings-card {
    padding: 20px;
    margin-bottom: 24px;
}

.setting-item-premium {
    --background: transparent;
    --padding-start: 0;
}

.setting-item-premium ion-label {
    font-size: 11px !important;
    font-weight: 900 !important;
    color: #ffbf00 !important;
    letter-spacing: 2px !important;
    margin-bottom: 12px !important;
}

.edit-row-premium {
    display: flex;
    gap: 12px;
    align-items: center;
    width: 100%;
}

.edit-row-premium ion-input {
    background: rgba(0, 0, 0, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    --padding-start: 15px;
    font-weight: 600;
}

.gold-save-btn {
    --background: linear-gradient(135deg, #ffbf00, #ff8c00);
    --color: black;
    --border-radius: 12px;
    font-weight: 800;
    margin: 0;
    min-width: 90px;
}

.danger-zone {
    padding: 24px;
    background: rgba(235, 68, 90, 0.05) !important;
    border: 1px solid rgba(235, 68, 90, 0.2) !important;
    border-radius: 24px;
    text-align: center;
}

.danger-zone h3 {
    margin: 0;
    color: #eb445a;
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 2px;
}

.danger-zone p {
    margin: 5px 0 15px;
    font-size: 12px;
    color: rgba(235, 68, 90, 0.7);
    font-weight: 600;
}

.dissolve-btn {
    --border-radius: 12px;
    --border-width: 1.5px;
    font-weight: 800;
    letter-spacing: 1px;
}

.empty-chat-v2 {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0.3;
    padding: 40px;
}

.empty-icon-v2 {
    font-size: 40px;
}

@keyframes pop {
  from { transform: scale(0.8) translateY(10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.animate-in {
  animation: fadeIn 0.8s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Story Viewer Styles */
.story-viewer-modal {
    --background: black;
}

.story-viewer-v4 {
    height: 100%;
    background: black;
    display: flex;
    flex-direction: column;
    position: relative;
    padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
}

.story-progress-group {
    display: flex;
    gap: 4px;
    padding: 10px 15px;
    z-index: 20;
}

.story-progress-bar {
    flex: 1;
    height: 2px;
    background: rgba(255,255,255,0.2);
    border-radius: 1px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: white;
    width: 0%;
}

.progress-fill.complete { width: 100%; }
.progress-fill.active {
    animation: storyProgress 5s linear forwards;
}

@keyframes storyProgress {
    from { width: 0%; }
    to { width: 100%; }
}

.viewer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 15px;
    z-index: 20;
}

.bee-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.bee-avatar {
    font-size: 24px;
}

.bee-meta h4 {
    margin: 0;
    color: white;
    font-size: 14px;
    font-weight: 900;
}

.bee-meta p {
    margin: 0;
    color: rgba(255,255,255,0.5);
    font-size: 10px;
}

.viewer-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.viewer-content img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.text-story-full {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

.text-story-full p {
    color: white;
    font-size: 24px;
    font-weight: 800;
    text-align: center;
    line-height: 1.4;
}

.nav-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    z-index: 10;
}

.nav-prev, .nav-next {
    flex: 1;
    height: 100%;
}

/* Full Img Modal */
.full-img-modal {
    --background: rgba(0,0,0,0.9);
}

.full-img-container {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.full-img-container img {
    max-width: 100%;
    max-height: 90%;
}

.full-img-container .close-btn {
    position: absolute;
    top: env(safe-area-inset-top);
    right: 15px;
    font-size: 24px;
}

/* Reactions Styles */
.reactions-container {
  display: flex;
  position: absolute;
  bottom: -10px;
  right: 8px;
  z-index: 10;
  gap: 2px;
}

.own-buzz .reactions-container {
  right: auto;
  left: 8px;
}

.reaction-pill {
  background: #1e1e1e;
  padding: 2px 6px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.reaction-pill:active {
  transform: scale(0.9);
}

.reaction-pill.reacted {
  background: rgba(255, 191, 0, 0.2);
  border-color: rgba(255, 191, 0, 0.4);
}

.own-buzz .reaction-pill {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.05);
}

.own-buzz .reaction-pill.reacted {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.reaction-pill .emoji {
  font-size: 12px;
}

.reaction-pill .count {
  font-weight: 800;
  color: rgba(255, 255, 255, 0.8);
}

.own-buzz .reaction-pill .count {
  color: rgba(0, 0, 0, 0.7);
}

/* Buzz Bubble */
.buzz-bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  background: white;
  color: black;
  padding: 4px 6px;
  border-radius: 10px;
  margin-bottom: 12px;
  width: 80px;
  white-space: normal;
  text-align: center;
  box-shadow: 0 4px 15px rgba(255, 191, 0, 0.4);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  line-height: 1.1;
  transform: translateX(-50%) scale(calc(1 / var(--bee-scale)));
  transform-origin: bottom center;
}

.buzz-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: white transparent transparent transparent;
}

.buzz-bubble p {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.bee-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 50px;
  height: 50px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.bee-juicy {
  animation: bee-squash-stretch 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes bee-squash-stretch {
  0% { transform: scale(1); }
  20% { transform: scale(1.4, 0.6); }
  40% { transform: scale(0.7, 1.3); }
  60% { transform: scale(1.1, 0.9); }
  80% { transform: scale(0.95, 1.05); }
  100% { transform: scale(1); }
}

.bee-icon-composite {
  position: absolute !important;
  pointer-events: none;
  /* Centering the 220px box in the 50px parent */
  left: 50%;
  top: 50%;
  margin-left: -110px;
  margin-top: -110px;
}

.bee-name-tag {
  position: absolute;
  top: 100%;
  left: 50%;
  font-size: 10px;
  font-weight: 800;
  color: #ffbf00;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  background: rgba(0, 0, 0, 0.6);
  padding: 3px 8px;
  border-radius: 6px;
  margin-top: 4px;
  text-align: center;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid transparent;
  transform: translateX(-50%) scale(calc(1 / var(--bee-scale)));
  transform-origin: center;
  z-index: 5;
}

/* Emoji Picker Carousel Styles */
.emoji-picker-popover {
    --width: 320px;
    --height: 70px;
    --background: rgba(0, 0, 0, 0.85);
    --backdrop-filter: blur(24px);
    --border-radius: 35px;
    --box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    --backdrop-opacity: 0;
}

.emoji-picker-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    overflow: hidden;
    background: transparent;
}

.emoji-carousel {
    flex: 1;
    display: flex;
    overflow-x: auto;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    gap: 14px;
    padding: 0 15px;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
}

.emoji-carousel::-webkit-scrollbar {
    display: none;
}

.emoji-delete-btn {
    width: 54px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(235, 68, 90, 0.15);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    color: #eb445a;
    font-size: 20px;
    cursor: pointer;
    transition: background 0.2s;
}

.emoji-delete-btn:active {
    background: rgba(235, 68, 90, 0.3);
}

.emoji-option {
    font-size: 34px;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    flex-shrink: 0;
    scroll-snap-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
}

.emoji-option:active {
    transform: scale(1.8);
}

</style>
