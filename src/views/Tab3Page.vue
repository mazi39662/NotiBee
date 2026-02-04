<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content
          :pulling-icon="chevronDownCircleOutline"
          pulling-text="Pull to refresh"
          refreshing-spinner="crescent"
          refreshing-text="Refreshing colony...">
        </ion-refresher-content>
      </ion-refresher>
      
      <div class="colony-container">
        <!-- Profile Section -->
        <div class="profile-card glass-panel gold-glow">
          <div class="profile-header">
            <div class="avatar-edit-container-settings" @click="router.push('/tabs/customize-bee')">
              <div class="profile-bee-stage-settings">
                <BeeComposite 
                  :customization="localCustomization" 
                  :animated="true"
                  :scale="0.8"
                />
              </div>
              <div class="edit-icon-badge">
                <ion-icon :icon="pencilOutline"></ion-icon>
              </div>
            </div>
            <div class="profile-meta" v-if="userBeeId">
              <h2>{{ userBeeId }}</h2>
              <!-- <p class="bee-id">ID: #{{ userBeeId.toUpperCase() }}</p> -->
              
              <!-- Push Status Badge -->
              <div class="status-badge" :class="tokenStatus.class">
                <span class="dot"></span>
                {{ tokenStatus.label }}
              </div>
              
              <p v-if="deviceToken" class="token-display">P-TOKEN: {{ deviceToken.substring(0, 15) }}...</p>
              
              <div class="profile-actions">
                <ion-button fill="solid" color="primary" class="action-btn view-profile-btn" @click="router.push(`/tabs/profile/${userBeeId}`)">
                  <ion-icon :icon="personOutline" slot="start"></ion-icon>
                  View Profile
                </ion-button>
                <ion-button fill="outline" color="primary" class="action-btn qr-btn" @click="isQrModalOpen = true">
                  <ion-icon :icon="qrCodeOutline" slot="start"></ion-icon>
                  My QR
                </ion-button>
              </div>
            </div>
            <div class="profile-meta" v-else>
              <ion-item lines="none" class="id-input-item">
                <ion-input label="Set your Bee ID" label-placement="stacked" placeholder="e.g. HoneyKing" v-model="newBeeId"></ion-input>
              </ion-item>
              <ion-item lines="none" class="id-input-item">
                <ion-input 
                  :type="showClaimPassword ? 'text' : 'password'" 
                  label="Set Password" 
                  label-placement="stacked" 
                  placeholder="••••••••" 
                  v-model="newPassword"
                >
                  <ion-button fill="clear" slot="end" @click="showClaimPassword = !showClaimPassword" class="eye-button">
                    <ion-icon :icon="showClaimPassword ? eyeOff : eye" slot="icon-only"></ion-icon>
                  </ion-button>
                </ion-input>
              </ion-item>
              <ion-item lines="none" class="id-input-item">
                <ion-input 
                  :type="showClaimConfirmPassword ? 'text' : 'password'" 
                  label="Confirm Password" 
                  label-placement="stacked" 
                  placeholder="••••••••" 
                  v-model="claimConfirmPassword"
                >
                  <ion-button fill="clear" slot="end" @click="showClaimConfirmPassword = !showClaimConfirmPassword" class="eye-button">
                    <ion-icon :icon="showClaimConfirmPassword ? eyeOff : eye" slot="icon-only"></ion-icon>
                  </ion-button>
                </ion-input>
              </ion-item>
              <ion-button size="small" expand="block" color="primary" @click="doSaveId" :disabled="isSaving || !newBeeId || !newPassword || !claimConfirmPassword">
                <span v-if="!isSaving">Claim your ID</span>
                <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
              </ion-button>
            </div>
          </div>
        
      </div> <!-- End of profile-card -->

        <!-- Gamification Section -->
        <div class="gamification-section">
          <div class="gamification-buttons">
            <div class="premium-btn achievements-box gold-glow" @click="router.push('/tabs/achievements')">
              <div class="btn-icon">
                <ion-icon :icon="trophyOutline"></ion-icon>
              </div>
              <div class="btn-text">
                <span class="label">Achievements</span>
                <span class="sub-label">View badges</span>
              </div>
              <div class="btn-arrow">
                <ion-icon :icon="chevronForwardOutline"></ion-icon>
              </div>
            </div>
            
            <div class="premium-btn leaderboard-box silver-glow" @click="router.push('/tabs/leaderboard')">
              <div class="btn-icon">
                <ion-icon :icon="podiumOutline"></ion-icon>
              </div>
              <div class="btn-text">
                <span class="label">Leaderboard</span>
                <span class="sub-label">Top bees</span>
              </div>
              <div class="btn-arrow">
                <ion-icon :icon="chevronForwardOutline"></ion-icon>
              </div>
            </div>
          </div>
        </div>
      

        <!-- Friends List -->
        <div class="colony-list-section">
          <div class="bee-list">
            <ion-item v-for="friend in colony" :key="friend.beeId" lines="full" class="bee-item">
              <ion-avatar slot="start" class="colony-avatar">
                <BeeComposite 
                  :customization="friend.customization" 
                  :scale="0.25"
                  :animated="true"
                />
              </ion-avatar>
              <ion-label>
                <h2>{{ friend.beeId }}</h2>
                <p>Last active: {{ friend.lastSeen ? new Date(friend.lastSeen).toLocaleTimeString() : 'Unknown' }}</p>
              </ion-label>
              <ion-button slot="end" fill="clear" color="primary">
                <ion-icon :icon="flash"></ion-icon>
              </ion-button>
            </ion-item>
          </div>
        </div>

        <div class="settings-section">
          <ion-list :inset="true" class="glass-list">
            <ion-item button @click="isNotifModalOpen = true">
              <ion-icon :icon="notificationsOutline" slot="start"></ion-icon>
              <ion-label>Notification Settings</ion-label>
            </ion-item>
            <ion-item button @click="isVerifyModalOpen = true">
              <ion-icon :icon="shieldCheckmarkOutline" slot="start"></ion-icon>
              <ion-label>Privacy & Security</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="isDarkMode ? moonOutline : sunnyOutline" slot="start"></ion-icon>
              <ion-label>
                <h2>Night Mode</h2>
                <p>Gentle on your eyes.</p>
              </ion-label>
              <ion-toggle 
                slot="end" 
                :checked="isDarkMode"
                @ionChange="applyTheme($event.detail.checked)"
              ></ion-toggle>
            </ion-item>
            <ion-item>
              <ion-icon :icon="notificationsOutline" slot="start"></ion-icon>
              <ion-label>
                <h2>Save Buzz History</h2>
                <p>Keep your conversations locally.</p>
              </ion-label>
              <ion-toggle 
                slot="end" 
                :checked="saveHistoryEnabled"
                @ionChange="toggleHistory($event.detail.checked)"
              ></ion-toggle>
            </ion-item>
            <ion-item button @click="router.push('/legal')">
              <ion-icon :icon="documentTextOutline" slot="start"></ion-icon>
              <ion-label>Legal & Privacy</ion-label>
            </ion-item>
            <ion-item button @click="openFeedbackForm">
              <ion-icon :icon="chatbubbleEllipsesOutline" slot="start"></ion-icon>
              <ion-label>Feedback</ion-label>
            </ion-item>
          </ion-list>
        </div>

        <div class="settings-section">
          <ion-list :inset="true" class="glass-list">
            <ion-item button class="logout-item" @click="logout" lines="none">
              <ion-icon :icon="logOutOutline" slot="start" color="primary"></ion-icon>
              <ion-label>Fly Away (Logout)</ion-label>
            </ion-item>
          </ion-list>
        </div>

        <div class="danger-zone">
          <h3 class="zone-title">DANGER ZONE</h3>
          <ion-list :inset="true" class="glass-list danger-list">
            <ion-item button class="danger-item" lines="none" @click="handleDeleteAccount">
              <ion-icon :icon="trashOutline" slot="start" color="danger"></ion-icon>
              <ion-label>
                <h2 style="color: var(--ion-color-danger);">Dissolve Identity</h2>
                <p v-if="daysUntilDeletion !== null" style="color: var(--ion-color-danger); opacity: 0.8; font-size: 11px; font-weight: 700;">
                  INACTIVITY DELETE IN: {{ daysUntilDeletion }} {{ daysUntilDeletion === 1 ? 'DAY' : 'DAYS' }}
                </p>
                <p v-else style="color: var(--ion-color-danger); opacity: 0.8; font-size: 11px;">Permanently delete account</p>
              </ion-label>
              <ion-badge slot="end" color="danger" v-if="daysUntilDeletion !== null" mode="ios">{{ daysUntilDeletion }}d</ion-badge>
            </ion-item>
          </ion-list>
          <p class="version-tag">NotiBee v{{ APP_VERSION }}</p>
        </div>
      </div>
      <HiveSplash :show="showSplash" status-text="Updating profile..." />

      <!-- My QR Code Modal -->
      <ion-modal 
        :is-open="isQrModalOpen" 
        @didDismiss="isQrModalOpen = false"
        class="qr-modal-fullscreen"
      >
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>My Bee ID Card</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="isQrModalOpen = false">
                <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding qr-modal-content">
          <div class="modal-wrapper qr-display-wrapper">
            <div class="modal-header-desc">
              <h2>Buzz-In Ready</h2>
              <p>Scan this to quickly add me to your Hive.</p>
            </div>
            
            <div id="qr-export-area" class="qr-container glass-panel">
              <div class="qr-profile-bee-stage">
                  <BeeComposite 
                    :customization="localCustomization" 
                    :animated="true"
                    :scale="0.6"
                  />
              </div>
              <div class="qr-white-bg">
                <qrcode-vue 
                  :value="userBeeId || ''" 
                  :size="220" 
                  level="H" 
                  background="#ffffff"
                  foreground="#000000"
                />
              </div>
              <div class="qr-id-tag">{{ userBeeId }}</div>
            </div>

            <div class="modal-footer-btns">
              <ion-button expand="block" color="primary" class="download-qr-btn" @click="downloadQR">
                  <ion-icon :icon="downloadOutline" slot="start"></ion-icon>
                  DOWNLOAD ID CARD
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Verification Modal -->
      <ion-modal 
        :is-open="isVerifyModalOpen" 
        @didDismiss="isVerifyModalOpen = false"
        class="qr-modal"
        :initial-breakpoint="0.6"
        :breakpoints="[0, 0.6, 0.9]"
      >
        <div class="modal-wrapper qr-display-wrapper">
          <div class="modal-header">
            <div class="hex-icon gold-glow">
                <ion-icon :icon="lockClosedOutline"></ion-icon>
            </div>
            <h2>Verify Identity</h2>
            <p>Enter your password to access Privacy settings.</p>
          </div>
          
          <div class="settings-content glass-panel" style="margin: 20px 0;">
            <ion-item lines="none" class="id-input-item">
              <ion-input 
                :type="showVerifyPass ? 'text' : 'password'" 
                label="Password" 
                label-placement="stacked" 
                placeholder="••••••••" 
                v-model="verifyPassword"
                @keyup.enter="handleVerifyAccess"
              >
                <ion-button fill="clear" slot="end" @click="showVerifyPass = !showVerifyPass" class="eye-button-small">
                  <ion-icon :icon="showVerifyPass ? eyeOff : eye" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-input>
            </ion-item>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
            <ion-button expand="block" color="primary" @click="handleVerifyAccess" :disabled="isVerifying">
                <span v-if="!isVerifying">VERIFY</span>
                <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
            </ion-button>
            <ion-button expand="block" fill="clear" color="medium" @click="isVerifyModalOpen = false">
                CANCEL
            </ion-button>
          </div>
        </div>
      </ion-modal>

      <!-- Privacy & Security Modal -->
      <ion-modal 
        :is-open="isPrivacyModalOpen" 
        @didDismiss="isPrivacyModalOpen = false"
        class="privacy-modal"
        :initial-breakpoint="0.8"
        :breakpoints="[0, 0.8, 1]"
      >
        <div class="modal-wrapper privacy-display-wrapper">
          <div class="modal-header">
            <div class="hex-icon gold-glow">
                <ion-icon :icon="shieldCheckmarkOutline"></ion-icon>
            </div>
            <h2>Privacy & Security</h2>
            <p>Keep your account secure.</p>
          </div>

          <div class="settings-content glass-panel">
            <div v-if="!isChangingPassword">
               <ion-button expand="block" fill="outline" color="primary" @click="isChangingPassword = true">
                 Change Password
               </ion-button>
            </div>

            <div v-else class="password-change-form">
               <h3 class="form-title">CHANGE PASSWORD</h3>
               
               <ion-item lines="none" class="id-input-item">
                 <ion-input 
                   :type="showOldPass ? 'text' : 'password'" 
                   label="Current Password" 
                   label-placement="stacked" 
                   placeholder="••••••••" 
                   v-model="oldPassword"
                 >
                   <ion-button fill="clear" slot="end" @click="showOldPass = !showOldPass" class="eye-button-small">
                     <ion-icon :icon="showOldPass ? eyeOff : eye" slot="icon-only"></ion-icon>
                   </ion-button>
                 </ion-input>
               </ion-item>

               <ion-item lines="none" class="id-input-item">
                 <ion-input 
                   :type="showNewPass ? 'text' : 'password'" 
                   label="New Password" 
                   label-placement="stacked" 
                   placeholder="••••••••" 
                   v-model="newPass"
                 >
                   <ion-button fill="clear" slot="end" @click="showNewPass = !showNewPass" class="eye-button-small">
                     <ion-icon :icon="showNewPass ? eyeOff : eye" slot="icon-only"></ion-icon>
                   </ion-button>
                 </ion-input>
               </ion-item>

               <ion-item lines="none" class="id-input-item">
                 <ion-input 
                   :type="showConfirmPass ? 'text' : 'password'" 
                   label="Confirm New Password" 
                   label-placement="stacked" 
                   placeholder="••••••••" 
                   v-model="confirmPass"
                 >
                   <ion-button fill="clear" slot="end" @click="showConfirmPass = !showConfirmPass" class="eye-button-small">
                     <ion-icon :icon="showConfirmPass ? eyeOff : eye" slot="icon-only"></ion-icon>
                   </ion-button>
                 </ion-input>
               </ion-item>

               <div class="form-actions">
                 <ion-button expand="block" color="primary" @click="handleUpdatePassword" :disabled="isUpdatingPass">
                   <span v-if="!isUpdatingPass">UPDATE PASSWORD</span>
                   <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
                 </ion-button>
                 <ion-button expand="block" fill="clear" color="medium" @click="cancelPassChange">
                   CANCEL
                 </ion-button>
               </div>
            </div>
          </div>

          <ion-button expand="block" fill="clear" color="medium" @click="isPrivacyModalOpen = false" v-if="!isChangingPassword">
            CLOSE
          </ion-button>
        </div>
      </ion-modal>

      <!-- Notification Settings Modal -->
      <ion-modal 
        :is-open="isNotifModalOpen" 
        @didDismiss="isNotifModalOpen = false"
        class="notif-modal"
        :initial-breakpoint="0.8"
        :breakpoints="[0, 0.8, 1]"
      >
        <div class="modal-wrapper notif-display-wrapper">
          <div class="modal-header">
            <div class="hex-icon gold-glow">
                <ion-icon :icon="notificationsOutline"></ion-icon>
            </div>
            <h2>Notification Settings</h2>
            <p>Control how and when you're buzzed.</p>
          </div>

          <div class="settings-content glass-panel">
            <ion-list lines="none" class="transparent-list">
              <!-- Do Not Disturb -->
              <ion-item class="setting-item">
                <ion-icon :icon="moonOutline" slot="start" color="primary"></ion-icon>
                <ion-label>
                  <h3>Do Not Disturb</h3>
                  <p>Silence all notifications</p>
                </ion-label>
                <ion-toggle 
                  slot="end" 
                  :checked="prefs.doNotDisturb" 
                  @ionChange="toggleDND($event.detail.checked)"
                ></ion-toggle>
              </ion-item>

              <div class="divider"></div>

              <!-- Buzzes -->
              <ion-item class="setting-item">
                <ion-icon :icon="flash" slot="start" color="warning"></ion-icon>
                <ion-label>
                  <h3>Buzzes</h3>
                  <p>Incoming messages</p>
                </ion-label>
                <ion-toggle 
                  slot="end" 
                  :checked="prefs.notifyBuzzes" 
                  :disabled="prefs.doNotDisturb"
                  @ionChange="updatePrefs({ notifyBuzzes: $event.detail.checked })"
                ></ion-toggle>
              </ion-item>

              <!-- Vibrations -->
              <ion-item class="setting-item">
                <ion-icon :icon="syncOutline" slot="start" color="secondary"></ion-icon>
                <ion-label>
                  <h3>Vibrations</h3>
                  <p>Tactile shockwaves</p>
                </ion-label>
                <ion-toggle 
                  slot="end" 
                  :checked="prefs.notifyVibrations" 
                  :disabled="prefs.doNotDisturb"
                  @ionChange="updatePrefs({ notifyVibrations: $event.detail.checked })"
                ></ion-toggle>
              </ion-item>

              <!-- Friend Requests -->
              <ion-item class="setting-item">
                <ion-icon :icon="checkmarkCircleOutline" slot="start" color="success"></ion-icon>
                <ion-label>
                  <h3>Colony Growth</h3>
                  <p>New friend requests</p>
                </ion-label>
                <ion-toggle 
                  slot="end" 
                  :checked="prefs.notifyFriendRequests" 
                  :disabled="prefs.doNotDisturb"
                  @ionChange="updatePrefs({ notifyFriendRequests: $event.detail.checked })"
                ></ion-toggle>
              </ion-item>
            </ion-list>
          </div>

          <ion-button expand="block" fill="clear" color="medium" @click="isNotifModalOpen = false">
            CLOSE
          </ion-button>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
    IonAvatar, IonItem, IonLabel, IonButton, IonIcon, 
    IonList, IonInput, toastController, IonSpinner, alertController,
    IonToggle, IonModal, IonRefresher, IonRefresherContent,
    IonBadge, onIonViewWillEnter, IonButtons
} from '@ionic/vue';
import QrcodeVue from 'qrcode.vue';
import HiveSplash from '@/components/HiveSplash.vue';
import BeeComposite from '@/components/BeeComposite.vue';
import { 
    flash, notificationsOutline, shieldCheckmarkOutline, 
    logOutOutline, checkmarkCircleOutline, trashOutline,
    qrCodeOutline, closeCircleOutline, brushOutline, closeOutline, pencilOutline,
    moonOutline, sunnyOutline, chevronDownCircleOutline,
    trophyOutline, podiumOutline, syncOutline,
    eye, eyeOff, lockClosedOutline, chevronForwardOutline,
    documentTextOutline, downloadOutline, shareOutline, personOutline,
    chatbubbleEllipsesOutline
} from 'ionicons/icons';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePushService } from '@/services/PushService';
import { useUserService } from '@/services/UserService';
import { useBuzzService } from '@/services/BuzzService';
import { useThemeService } from '@/services/ThemeService';
import { useStreakService } from '@/services/StreakService';
import { useNotificationService } from '@/services/NotificationService';
import { useUpdateService } from '@/services/UpdateService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import html2canvas from 'html2canvas';

const { deviceToken } = usePushService();
const { 
    userBeeId, saveUserProfile, getAllBees, getFriends, 
    deleteUserAccount, clearLocalData, getUserProfile, updateOnlineStatus 
} = useUserService();
const { saveHistoryEnabled, toggleHistory } = useBuzzService();
const { isDarkMode, applyTheme } = useThemeService();
const { syncUserStats } = useStreakService();
const { APP_VERSION } = useUpdateService();
const router = useRouter();

const downloadQR = async () => {
    const element = document.getElementById('qr-export-area');
    if (!element) return;

    try {
        const loading = await toastController.create({
            message: 'Generating Bee ID Card...',
            duration: 1000,
            color: 'medium',
            position: 'top'
        });
        await loading.present();

        // Use html2canvas to capture the entire card
        const canvas = await html2canvas(element, {
            backgroundColor: '#000000', // Match app background
            scale: 2, // Higher quality
            useCORS: true, 
            logging: false
        });
        
        const dataUrl = canvas.toDataURL('image/png');
        const fileName = `notibee-id-${userBeeId.value}.png`;

        if (Capacitor.isNativePlatform()) {
            try {
                const perm = await Filesystem.checkPermissions();
                if (perm.publicStorage !== 'granted') {
                    await Filesystem.requestPermissions();
                }

                try {
                    await Filesystem.mkdir({
                        path: 'NotiBee',
                        directory: Directory.Documents,
                        recursive: true
                    });
                } catch (e) {}

                const base64Data = dataUrl.split(',')[1];
                await Filesystem.writeFile({
                    path: `NotiBee/${fileName}`,
                    data: base64Data,
                    directory: Directory.Documents
                });

                const toast = await toastController.create({
                    message: 'Bee ID Card saved to NotiBee folder! 🍯',
                    duration: 3000,
                    color: 'primary',
                    position: 'top'
                });
                await toast.present();
            } catch (err) {
                console.error('Filesystem error:', err);
                throw new Error('Save failed');
            }
        } else {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            link.click();
            
            const toast = await toastController.create({
                message: 'Bee ID Card downloaded! 🍯',
                duration: 2000,
                color: 'primary',
                position: 'top'
            });
            await toast.present();
        }
    } catch (e) {
        console.error('Capture failed', e);
        const toast = await toastController.create({
            message: 'Failed to generate ID card.',
            duration: 2000,
            color: 'danger',
            position: 'top'
        });
        await toast.present();
    }
};

const newBeeId = ref('');
const newPassword = ref('');
const showClaimPassword = ref(false);
const isSaving = ref(false);
const showSplash = ref(true);
const isQrModalOpen = ref(false);
const isVerifyModalOpen = ref(false);
const isPrivacyModalOpen = ref(false);
const isNotifModalOpen = ref(false);
const isVerifying = ref(false);
const verifyPassword = ref('');
const showVerifyPass = ref(false);
const isChangingPassword = ref(false);
const oldPassword = ref('');
const newPass = ref('');
const confirmPass = ref('');
const claimConfirmPassword = ref('');
const showClaimConfirmPassword = ref(false);
const showOldPass = ref(false);
const showNewPass = ref(false);
const showConfirmPass = ref(false);
const isUpdatingPass = ref(false);
const userData = ref<any>(null);

const localCustomization = reactive({
  top: 'none',
  body: 'none',
  eyes: 'none'
});

const { prefs, updatePrefs, toggleDND } = useNotificationService();

const daysUntilDeletion = computed(() => {
    if (!userData.value?.lastSeen) return 30; // Default to 30 if no data yet
    
    const lastSeen = new Date(userData.value.lastSeen).getTime();
    const expires = lastSeen + (30 * 24 * 60 * 60 * 1000); // 30 days
    const now = Date.now();
    
    const diff = expires - now;
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    
    return days > 0 ? (days > 30 ? 30 : days) : 0;
});

onIonViewWillEnter(async () => {
    // Refresh user bee's customization from local storage for immediate update
    if (userBeeId.value) {
        const saved = localStorage.getItem('bee_customization');
        if (saved) {
            const parsed = JSON.parse(saved);
            localCustomization.top = parsed.top || 'none';
            localCustomization.body = parsed.body || 'none';
            localCustomization.eyes = parsed.eyes || 'none';
        }
    }
});

onMounted(async () => {
    // Auto-sync stats in background when profile is viewed
    if (userBeeId.value) {
        syncUserStats(userBeeId.value).catch(console.error);
        updateOnlineStatus().catch(console.error); // Reset deletion timer
        
        // Fetch user data for deletion countdown
        getUserProfile(userBeeId.value).then(data => {
            userData.value = data;
            if (data?.customization) {
              localCustomization.top = data.customization.top || 'none';
              localCustomization.body = data.customization.body || 'none';
              localStorage.setItem('bee_customization', JSON.stringify(localCustomization));
            } else {
              const saved = localStorage.getItem('bee_customization');
              if (saved) {
                const parsed = JSON.parse(saved);
                localCustomization.top = parsed.top || 'none';
                localCustomization.body = parsed.body || 'none';
                localCustomization.eyes = parsed.eyes || 'none';
              }
            }
        }).catch(console.error);
    }

    setTimeout(() => {
        showSplash.value = false;
    }, 1500);
});

const allBees = getAllBees();
const friendsIds = getFriends();

const tokenStatus = computed(() => {
    if (Capacitor.getPlatform() === 'web') return { label: 'Web Mode (No Push)', class: 'web' };
    if (deviceToken.value) return { label: 'Buzz Ready', class: 'ready' };
    return { label: 'Waiting for Token...', class: 'waiting' };
});

const colony = computed(() => {
    return allBees.value.filter(bee => friendsIds.value.includes(bee.beeId));
});

const doSaveId = async () => {
    if (!newBeeId.value || !newPassword.value || !claimConfirmPassword.value) return;

    if (newPassword.value !== claimConfirmPassword.value) {
        const alert = await alertController.create({
            header: 'Mismatch',
            message: 'Passwords do not match.',
            buttons: ['OK']
        });
        await alert.present();
        return;
    }
    
    isSaving.value = true;
    try {
        await saveUserProfile(newBeeId.value, deviceToken.value, false, newPassword.value);
        
        const toast = await toastController.create({
            message: `Welcome to the Hive, ${newBeeId.value}! 🐝`,
            duration: 3000,
            position: 'top',
            color: 'primary',
            icon: checkmarkCircleOutline,
            cssClass: 'custom-toast'
        });
        await toast.present();
    } catch (e: any) {
        const alert = await alertController.create({
            header: 'Claim Failed',
            message: e.message || 'Something went wrong while claiming your ID.',
            buttons: ['OK']
        });
        await alert.present();
    } finally {
        isSaving.value = false;
    }
};

const openFeedbackForm = () => {
  window.open('https://docs.google.com/forms/d/e/1FAIpQLSe9Xujo4tHVL6XppNazeiTfpLzhZSPNGZ0C3GUjVOW8hbDX7g/viewform?usp=publish-editor', '_system');
};

const handleVerifyAccess = async () => {
    if (!verifyPassword.value) return;

    isVerifying.value = true;
    try {
        if (!userBeeId.value) throw new Error('Not logged in');
        
        // Use saveUserProfile to verify current password
        await saveUserProfile(userBeeId.value, deviceToken.value, true, verifyPassword.value);
        
        // If it succeeds, open privacy modal
        isVerifyModalOpen.value = false;
        verifyPassword.value = '';
        isPrivacyModalOpen.value = true;
    } catch (e: any) {
        const alert = await alertController.create({
            header: 'Verification Failed',
            message: e.message || 'Incorrect password.',
            buttons: ['OK']
        });
        await alert.present();
    } finally {
        isVerifying.value = false;
    }
};

const handleUpdatePassword = async () => {
    if (!oldPassword.value || !newPass.value || !confirmPass.value) {
        const alert = await alertController.create({
            header: 'Missing Fields',
            message: 'Please fill in all password fields.',
            buttons: ['OK']
        });
        await alert.present();
        return;
    }

    if (newPass.value !== confirmPass.value) {
        const alert = await alertController.create({
            header: 'Mismatch',
            message: 'New password and confirmation do not match.',
            buttons: ['OK']
        });
        await alert.present();
        return;
    }

    if (newPass.value.length < 4) {
        const alert = await alertController.create({
            header: 'Weak Password',
            message: 'New password must be at least 4 characters.',
            buttons: ['OK']
        });
        await alert.present();
        return;
    }

    isUpdatingPass.value = true;
    try {
        if (!userBeeId.value) throw new Error('Not logged in');
        
        // Use saveUserProfile which handles password verification and update
        await saveUserProfile(userBeeId.value, deviceToken.value, true, oldPassword.value);
        
        // If that succeeded, now update to the NEW password 
        // We reuse saveUserProfile but pass isLogin=false to trigger "registration/update" logic
        // which our refined version allows if UID matches
        await saveUserProfile(userBeeId.value, deviceToken.value, false, newPass.value);

        const toast = await toastController.create({
            message: 'Password changed successfully! 🍯',
            duration: 3000,
            position: 'top',
            color: 'primary',
            icon: checkmarkCircleOutline
        });
        await toast.present();
        cancelPassChange();
    } catch (e: any) {
        const alert = await alertController.create({
            header: 'Update Failed',
            message: e.message || 'Check your current password and try again.',
            buttons: ['OK']
        });
        await alert.present();
    } finally {
        isUpdatingPass.value = false;
    }
};

const cancelPassChange = () => {
    isChangingPassword.value = false;
    oldPassword.value = '';
    newPass.value = '';
    confirmPass.value = '';
};

const handleDeleteAccount = async () => {
    const alert = await alertController.create({
        header: 'Dissolve Identity?',
        message: 'This will permanently remove your Bee ID and data from the Hive. You cannot undo this.',
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            { 
                text: 'DISSOLVE', 
                role: 'destructive',
                handler: async () => {
                    showSplash.value = true;
                    try {
                        await deleteUserAccount();
                        router.push('/onboarding');
                    } catch (e) {
                        console.error(e);
                    } finally {
                        showSplash.value = false;
                    }
                } 
            }
        ]
    });
    await alert.present();
};

const handleRefresh = async (event: CustomEvent) => {
    // Refresh user data & stats
    try {
        if (userBeeId.value) {
            await syncUserStats(userBeeId.value);
            const data = await getUserProfile(userBeeId.value);
            userData.value = data;
        }
    } catch (e) {
        console.error('Refresh error:', e);
    } finally {
        (event.target as any)?.complete();
    }
};

const logout = () => {
    clearLocalData();
    router.push('/onboarding');
};
</script>

<style scoped>
ion-header {
  box-shadow: none;
  background: transparent;
}

ion-toolbar {
  --background: rgba(26, 26, 46, 0.6);
  --border-style: none;
  --color: white;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.colony-container {
  padding: max(10px, env(safe-area-inset-top) + 20px) clamp(12px, 4vw, 20px) 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100vh - 100px);
  max-width: 600px;
  margin: 0 auto;
}

.profile-card {
  padding: 24px;
  border-radius: 24px;
  text-align: center;
}

.profile-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 15px;
}

.action-btn {
  flex: 1;
  --border-radius: 12px;
  font-weight: 700;
  text-transform: none;
  height: 40px;
  font-size: 12px;
  margin: 0;
}

.view-profile-btn {
  --background: var(--ion-color-primary);
  --color: black;
}

.qr-btn {
  --color: var(--ion-color-primary);
  --border-color: rgba(255, 191, 0, 0.3);
}

.customize-btn {
  --background: var(--ion-color-primary);
  --color: black;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.avatar-edit-container-settings {
  position: relative;
  cursor: pointer;
  margin-bottom: 10px;
  transition: transform 0.2s ease;
}

.avatar-edit-container-settings:active {
  transform: scale(0.95);
}

.profile-bee-stage-settings {
  width: clamp(120px, 40vw, 180px);
  height: clamp(120px, 40vw, 180px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 191, 0, 0.05);
  border-radius: 50%;
  border: 4px solid rgba(255, 191, 0, 0.2);
  box-shadow: 0 0 30px rgba(255, 191, 0, 0.2);
}

.edit-icon-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: var(--ion-color-primary);
  color: black;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #1a1a2e;
  font-size: 18px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  z-index: 5;
}

.profile-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.profile-meta h2 {
  margin: 0;
  font-size: clamp(1.4rem, 6vw, 1.8rem);
  font-weight: 800;
}

.bee-id {
  margin: 4px 0 0;
  font-family: monospace;
  color: var(--ion-color-primary);
  letter-spacing: 1px;
}

.id-input-item {
  --background: rgba(255, 255, 255, 0.05);
  --border-radius: 12px;
  margin-bottom: 8px;
  width: 100%;
}

.eye-button {
  --padding-start: 10px;
  --padding-end: 10px;
  margin-top: 15px;
  height: 30px;
}

.token-display {
  font-size: 10px;
  color: var(--ion-color-medium);
  font-family: monospace;
  margin-top: 8px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  margin: 5px 0;
}

.status-badge.web { background: var(--glass-bg); color: var(--ion-color-medium); }
.status-badge.ready { background: rgba(45, 211, 111, 0.2); color: #2dd36f; }
.status-badge.waiting { background: rgba(255, 191, 0, 0.2); color: #ffbf00; }

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.waiting .dot {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0.4; transform: scale(0.8); }
}

/* Gamification Section */
.gamification-section {
  border-top: 1px solid rgba(255, 191, 0, 0.1);
}

.gamification-section h3 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: rgba(255, 191, 0, 0.4);
  margin-bottom: 16px;
  font-weight: 800;
}

.gamification-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 8px 0;
}

.premium-btn {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-radius: 24px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.premium-btn:active {
  transform: scale(0.96);
}

.achievements-box {
  background: linear-gradient(135deg, rgba(255, 191, 0, 0.15) 0%, rgba(255, 149, 0, 0.05) 100%);
  border: 1px solid rgba(255, 191, 0, 0.2);
}

.leaderboard-box {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%);
}

.btn-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
  color: #ffbf00;
}

.achievements-box .btn-icon {
  background: rgba(255, 191, 0, 0.2);
  color: #ffbf00;
}

.btn-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.btn-text .label {
  font-size: clamp(0.95rem, 4.5vw, 1.1rem);
  font-weight: 800;
  color: white;
}

.btn-text .sub-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.btn-arrow {
  color: rgba(255, 255, 255, 0.2);
  font-size: 20px;
}

.silver-glow {
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
}


.colony-list-section h3 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-bottom: 12px;
}

.bee-item {
  --background: transparent;
  --padding-start: 0;
}

.list-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 20px;
}

.colony-avatar {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  position: relative;
  margin-right: 12px;
}

.glass-list {
  background: transparent;
  margin: 0;
}

.glass-list ion-item {
  --background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  margin-bottom: 2px;
}

.danger-zone {
  margin-top: 30px;
  padding-bottom: 30px;
}

.zone-title {
  font-size: 10px;
  font-weight: 800;
  color: rgba(255, 68, 68, 0.5);
  letter-spacing: 2px;
  margin: 0 0 10px 18px;
  text-transform: uppercase;
}

.danger-list ion-item {
  --background: rgba(255, 68, 68, 0.03);
  border: 1px solid rgba(255, 68, 68, 0.1);
}

.version-tag {
  text-align: center;
  font-size: 10px;
  color: var(--ion-color-medium);
  margin-top: 20px;
  letter-spacing: 1px;
}

ion-toolbar {
  --background: transparent;
  --border-style: none;
}

/* QR Modal Styles */
.qr-modal-fullscreen {
    --border-radius: 0;
}

.qr-modal-fullscreen .modal-wrapper {
    height: 100%;
}

.qr-modal-content {
    --background: var(--ion-background-color);
}

.modal-header-desc {
    text-align: center;
    margin-bottom: 20px;
}

.modal-header-desc h2 {
    font-size: clamp(1.4rem, 6vw, 2rem);
    font-weight: 900;
    margin: 0;
}

.modal-header-desc p {
    font-size: 14px;
    color: var(--ion-color-medium);
    margin: 5px 0 0;
}

.modal-footer-btns {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.download-qr-btn {
    --border-radius: 16px;
    --box-shadow: 0 4px 15px rgba(255, 191, 0, 0.3);
    font-weight: 800;
    margin: 0;
    height: 54px;
}

.hex-icon {
    width: 60px;
    height: 60px;
    background: var(--ion-color-primary);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 15px;
    font-size: 30px;
    color: black;
}

.qr-container {
    padding: clamp(16px, 5vw, 30px);
    border-radius: 24px;
    margin: 20px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    background: #000000; /* Fixed black for capture */
    border: 1px solid rgba(255, 191, 0, 0.2);
}

#qr-export-area {
    padding: 30px;
    min-width: 300px;
}

.qr-white-bg {
    background: white;
    padding: 15px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.qr-id-tag {
    font-size: 18px;
    font-weight: 900;
    color: var(--ion-text-color);
    letter-spacing: 2px;
    text-transform: uppercase;
}

.qr-profile-bee-stage {
    width: 140px;
    height: 140px;
    background: rgba(255, 191, 0, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid rgba(255, 191, 0, 0.3);
    box-shadow: 0 0 20px rgba(255, 191, 0, 0.2);
}

/* Privacy Modal Styles */
.privacy-modal {
    --border-radius: 32px;
}

.privacy-display-wrapper {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.settings-content {
    width: 100%;
    padding: 24px;
    border-radius: 24px;
    margin: 20px 0;
    background: rgba(255, 255, 255, 0.05);
}

.password-change-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.form-title {
    font-size: 11px;
    font-weight: 800;
    color: var(--ion-color-primary);
    letter-spacing: 2px;
    margin-bottom: 8px;
    text-align: center;
}

.form-actions {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.eye-button-small {
    --padding-start: 8px;
    --padding-end: 8px;
    margin-top: 15px;
    height: 24px;
    font-size: 18px;
}

.danger-item {
    --background: transparent;
    --background-hover: rgba(var(--ion-color-danger-rgb), 0.05);
    --background-activated: rgba(var(--ion-color-danger-rgb), 0.1);
}

.notif-modal {
  --border-radius: 32px;
}

.notif-display-wrapper {
  padding: 30px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.transparent-list {
  --background: transparent;
  background: transparent;
  width: 100%;
}

.setting-item {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  margin-bottom: 5px;
}

.setting-item h3 {
  font-weight: 700;
  font-size: clamp(0.95rem, 4vw, 1.1rem);
  margin: 0;
}

.setting-item p {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 2px 0 0;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 15px 0;
}
</style>
