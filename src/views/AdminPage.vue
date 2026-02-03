<template>
  <ion-page>
    <ion-header class="ion-no-border admin-header">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab1" :icon="chevronBack"></ion-back-button>
        </ion-buttons>
        <ion-title>Hive Control Center 🛡️</ion-title>
        <ion-badge slot="end" :color="isSuperAdmin ? 'warning' : 'primary'" class="role-badge">
          {{ isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN' }}
        </ion-badge>
      </ion-toolbar>
      <ion-toolbar class="segment-toolbar">
        <ion-segment v-model="activeSegment" mode="ios" @ionChange="playHaptic">
          <ion-segment-button value="analytics" v-if="isSuperAdmin">
            <ion-label>DASHBOARD</ion-label>
          </ion-segment-button>
          <ion-segment-button value="users" v-if="isSuperAdmin">
            <ion-label>DIRECTORY</ion-label>
          </ion-segment-button>
          <ion-segment-button value="reports">
            <ion-label>REPORTS</ion-label>
            <ion-badge v-if="reports.length > 0" color="danger" class="notif-dot"></ion-badge>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="admin-content">
      <!-- Dashboard / Analytics Section -->
      <div v-if="activeSegment === 'analytics'" class="admin-section animate-fade-in">
        <div class="analytics-grid">
           <div class="stat-card glass-panel" v-for="(stat, i) in statCards" :key="stat.label" :style="{ animationDelay: (i * 0.1) + 's' }">
             <div class="stat-icon" :style="{ color: stat.color }">{{ stat.icon }}</div>
             <div class="stat-info">
               <span class="stat-label">{{ stat.label }}</span>
               <h2 class="stat-value">{{ stat.value }}</h2>
             </div>
           </div>
        </div>

        <div class="analytics-card glass-panel animate-pop" style="animation-delay: 0.4s">
           <div class="card-header">
             <h3>Active Colony Stats</h3>
             <ion-button fill="clear" size="small" @click="loadAnalytics">Refresh</ion-button>
           </div>
           <div class="status-rows">
             <div class="status-row">
               <span class="row-label">Online Bees (5m)</span>
               <span class="row-value online">{{ analytics?.onlineUsers || 0 }}</span>
             </div>
             <div class="status-row">
               <span class="row-label">Joined Today</span>
               <span class="row-value">{{ analytics?.newUsersToday || 0 }}</span>
             </div>
             <div class="status-row">
               <span class="row-label">Reported Items</span>
               <span class="row-value" :class="{ 'warning-text': reports.length > 0 }">{{ reports.length }}</span>
             </div>
           </div>
        </div>

        <div class="analytics-card glass-panel animate-pop" style="animation-delay: 0.5s">
           <h3>System Health</h3>
           <div class="health-bar-container">
             <div class="health-bar-fill" style="width: 100%"></div>
           </div>
           <p class="health-text">Firestore Swarm Sync: 100% Operational</p>
        </div>
      </div>

      <!-- Bee Directory Section -->
      <div v-if="activeSegment === 'users'" class="admin-section directory-section">
        <div class="directory-header glass-panel">
          <ion-searchbar 
            placeholder="Search by Bee ID..." 
            v-model="userSearchQuery"
            @ionChange="handleUserSearch"
            mode="ios"
            class="directory-search"
          ></ion-searchbar>
        </div>

        <div v-if="foundUser" class="found-user-card glass-panel animate-pop">
          <div class="user-main">
            <div class="user-avatar-mini">🐝</div>
            <div class="user-info-text">
              <h3>{{ foundUser.beeId }}</h3>
              <p><ion-badge :color="getRoleColor(foundUser.role)">{{ foundUser.role || 'User' }}</ion-badge></p>
            </div>
          </div>
          <div class="user-actions">
            <template v-if="isSuperAdmin && foundUser.role !== 'super_admin'">
              <ion-button size="small" :color="foundUser.role === 'admin' ? 'warning' : 'secondary'" @click="foundUser.role === 'admin' ? handleDemote(foundUser.beeId) : handlePromote(foundUser.beeId)">
                 {{ foundUser.role === 'admin' ? 'Demote' : 'Promote' }}
              </ion-button>
            </template>
            <ion-button size="small" color="danger" @click="handleDeleteUser(foundUser.beeId)">Delete Account</ion-button>
          </div>
        </div>

        <ion-list class="bee-paged-list" v-if="!userSearchQuery">
          <ion-item v-for="user in paginatedUsers" :key="user.beeId" class="bee-item-row" @click="openUserOptions(user)">
             <div class="bee-avatar">🐝</div>
             <ion-label>
               <div class="bee-item-header">
                 <span class="bee-id-text">{{ user.beeId }}</span>
                 <ion-badge v-if="user.role" :color="getRoleColor(user.role)" class="tiny-badge">{{ user.role }}</ion-badge>
               </div>
               <p>Active {{ getRelativeTime(user.lastSeen) }}</p>
             </ion-label>
             <ion-icon :icon="chevronForward" slot="end" color="medium"></ion-icon>
          </ion-item>
        </ion-list>

        <ion-infinite-scroll v-if="!userSearchQuery && hasMore" @ionInfinite="loadMoreUsers">
          <ion-infinite-scroll-content loading-spinner="crescent"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </div>

      <!-- Reports Section -->
      <div v-if="activeSegment === 'reports'" class="admin-section reports-section">
        <div v-if="reports.length === 0" class="empty-reports-state">
           <div class="empty-icon">🛡️</div>
           <h3>No pending reports</h3>
           <p>The Hive is safe and healthy.</p>
        </div>
        
        <ion-list v-else class="reports-list">
          <div v-for="report in reports" :key="report.id" class="report-card-wrapper">
            <ion-item-sliding>
              <ion-item class="report-card-item">
                <ion-label>
                  <div class="report-badge-container" style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
                    <span v-for="r in Array.from(new Set(report.reasons || [report.reason]))" :key="(r as string)" class="report-badge">{{ r }}</span>
                  </div>
                  <div class="report-meta">
                    <span v-if="report.type === 'user_report'">Target: <b>{{ report.targetBeeId }}</b></span>
                    <span v-else>To Author: <b>{{ report.authorId }}</b></span>
                    <span>By: <b>{{ Array.from(new Set(report.reporters || [report.reportedBy])).join(', ') }}</b></span>
                  </div>
                  <div class="report-date">{{ formatTime(report.timestamp) }}</div>
                  <div class="report-actions-row">
                    <!-- Story Actions -->
                    <template v-if="report.type !== 'user_report'">
                      <ion-button size="small" fill="outline" @click="viewReportedStory(report)">PREVIEW</ion-button>
                      <ion-button size="small" color="danger" @click="handleDeleteStory(report.storyId)">DELETE POST</ion-button>
                    </template>
                    <!-- User Actions -->
                    <template v-else>
                      <ion-button size="small" fill="outline" @click="router.push(`/tabs/profile/${report.targetBeeId}`)">VIEW PROFILE</ion-button>
                      <ion-button size="small" color="danger" @click="handleDeleteUser(report.targetBeeId)">DELETE USER</ion-button>
                    </template>
                  </div>
                </ion-label>
              </ion-item>
              <ion-item-options side="end">
                <ion-item-option color="success" @click="dismissReport(report.id)">DISMISS</ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </div>
        </ion-list>
      </div>

      <!-- Post Preview Modal -->
      <ion-modal :is-open="!!selectedReportedStory" @didDismiss="selectedReportedStory = null" class="admin-preview-modal">
        <div class="preview-container" v-if="selectedReportedStory">
          <div class="preview-header">
            <h3>Content Enforcement</h3>
            <ion-button fill="clear" @click="selectedReportedStory = null">
              <ion-icon :icon="close"></ion-icon>
            </ion-button>
          </div>
          <div class="preview-body">
            <img v-if="selectedReportedStory.imageUrl" :src="selectedReportedStory.imageUrl" class="preview-img" />
            <div v-else class="text-post" :style="{ backgroundColor: selectedReportedStory.backgroundColor || '#ffbf00' }">
              {{ selectedReportedStory.textContent }}
            </div>
          </div>
          <div class="preview-footer">
            <ion-button expand="block" color="danger" @click="handleDeleteFromPreview">DELETE PERMANENTLY</ion-button>
          </div>
        </div>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonList, IonItem, IonLabel, IonButton, IonBadge, IonSegment, IonSegmentButton,
  IonSearchbar, IonSpinner, IonItemSliding, IonItemOptions, IonItemOption, IonModal,
  IonInfiniteScroll, IonInfiniteScrollContent, IonIcon,
  alertController, toastController, actionSheetController
} from '@ionic/vue';
import { 
  chevronBack, chevronForward, close, alertCircleOutline, 
  shieldCheckmarkOutline, barChartOutline, peopleOutline, warningOutline 
} from 'ionicons/icons';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserService } from '@/services/UserService';
import { useMyDaysService } from '@/services/MyDaysService';
import { db } from '@/services/FirebaseService';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const router = useRouter();

const { 
  isSuperAdmin, isAdmin, promoteToAdmin, demoteFromAdmin, adminDeleteUser, 
  getUserProfile, getAdminAnalytics, getPagedUsers 
} = useUserService();
const { adminDeleteStory } = useMyDaysService();

const activeSegment = ref(isSuperAdmin.value ? 'analytics' : 'reports');
const reports = ref<any[]>([]);
const analytics = ref<any>(null);

// Pagination State
const paginatedUsers = ref<any[]>([]);
const lastVisibleDoc = ref<any>(null);
const hasMore = ref(true);
const isSearching = ref(false);
const userSearchQuery = ref('');
const foundUser = ref<any>(null);
const selectedReportedStory = ref<any>(null);

const statCards = computed(() => [
  { label: 'Total Bees', value: analytics.value?.totalUsers || 0, icon: '🐝', color: '#ffbf00' },
  { label: 'Active Now', value: analytics.value?.onlineUsers || 0, icon: '🟢', color: '#2dd36f' },
  { label: 'Cloud Stories', value: analytics.value?.totalStories || 0, icon: '☁️', color: '#3dc2ff' },
  { label: 'New Today', value: analytics.value?.newUsersToday || 0, icon: '✨', color: '#ffd534' }
]);

onMounted(() => {
  // Listen for reports in real-time
  const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snap) => {
    reports.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });

  loadAnalytics();
  loadInitialUsers();
});

const playHaptic = () => Haptics.impact({ style: ImpactStyle.Light });

const loadAnalytics = async () => {
  analytics.value = await getAdminAnalytics();
};

const loadInitialUsers = async () => {
  const { users, lastDoc } = await getPagedUsers(null, 30);
  paginatedUsers.value = users;
  lastVisibleDoc.value = lastDoc;
  hasMore.value = users.length === 30;
};

const loadMoreUsers = async (event: any) => {
  if (!lastVisibleDoc.value) {
    event.target.complete();
    return;
  }
  const { users, lastDoc } = await getPagedUsers(lastVisibleDoc.value, 30);
  if (users.length > 0) {
    paginatedUsers.value.push(...users);
    lastVisibleDoc.value = lastDoc;
  }
  hasMore.value = users.length === 30;
  event.target.complete();
};

const formatTime = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

const getRelativeTime = (isoString?: string) => {
  if (!isoString) return 'unknown';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(isoString).toLocaleDateString();
};

const getRoleColor = (role: string) => {
  if (role === 'super_admin') return 'warning';
  if (role === 'admin') return 'primary';
  return 'medium';
};

const handleUserSearch = async () => {
  if (!userSearchQuery.value.trim()) {
    foundUser.value = null;
    return;
  }
  isSearching.value = true;
  try {
    foundUser.value = await getUserProfile(userSearchQuery.value.trim());
  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    isSearching.value = false;
  }
};

const openUserOptions = async (user: any) => {
  const sheet = await actionSheetController.create({
    header: user.beeId,
    buttons: [
      {
        text: user.role === 'admin' ? 'Demote from Admin' : 'Promote to Admin',
        handler: () => {
          user.role === 'admin' ? handleDemote(user.beeId) : handlePromote(user.beeId);
        }
      },
      {
        text: 'Delete Account',
        role: 'destructive',
        handler: () => handleDeleteUser(user.beeId)
      },
      { text: 'Cancel', role: 'cancel' }
    ]
  });
  await sheet.present();
};

const handlePromote = async (beeId: string) => {
  const alert = await alertController.create({
    header: 'Promote Bee',
    message: `Make ${beeId} an Admin?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Confirm', handler: async () => { await promoteToAdmin(beeId); loadInitialUsers(); if (foundUser.value) handleUserSearch(); } }
    ]
  });
  await alert.present();
};

const handleDemote = async (beeId: string) => {
  const alert = await alertController.create({
    header: 'Demote Bee',
    message: `Remove Admin privileges from ${beeId}?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Confirm', handler: async () => { await demoteFromAdmin(beeId); loadInitialUsers(); if (foundUser.value) handleUserSearch(); } }
    ]
  });
  await alert.present();
};

const handleDeleteUser = async (beeId: string) => {
  const alert = await alertController.create({
    header: 'Warning',
    message: `Permanently delete account for ${beeId}?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'DELETE', role: 'destructive', handler: async () => { await adminDeleteUser(beeId); loadInitialUsers(); foundUser.value = null; } }
    ]
  });
  await alert.present();
};

const viewReportedStory = async (report: any) => {
  const storyDoc = await getDoc(doc(db, 'stories', report.storyId));
  if (storyDoc.exists()) {
    selectedReportedStory.value = { id: storyDoc.id, ...storyDoc.data() };
  } else {
    const toast = await toastController.create({ message: 'Post already deleted.', duration: 2000, color: 'warning' });
    await toast.present();
    await dismissReport(report.id);
  }
};

const handleDeleteStory = async (storyId: string) => {
  const alert = await alertController.create({
    header: 'Delete Content',
    message: 'Permanently remove this nectar?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete', role: 'destructive', handler: async () => { await adminDeleteStory(storyId); } }
    ]
  });
  await alert.present();
};

const handleDeleteFromPreview = async () => {
  if (selectedReportedStory.value) {
    await handleDeleteStory(selectedReportedStory.value.id);
    selectedReportedStory.value = null;
  }
};

const dismissReport = async (reportId: string) => {
  await deleteDoc(doc(db, 'reports', reportId));
};
</script>

<style scoped>
.admin-header {
  --background: #000;
  border-bottom: 1px solid rgba(255, 191, 0, 0.15);
}

ion-toolbar {
  --background: #000;
  --color: white;
}

ion-title {
  font-weight: 800;
  letter-spacing: -0.5px;
  font-size: 1.2em;
}

.role-badge {
  margin-right: 12px;
  padding: 6px 12px;
  font-weight: 900;
  border-radius: 8px;
  letter-spacing: 0.5px;
}

/* Fixed Segment UI */
.segment-toolbar {
  --padding-top: 0;
  --padding-bottom: 10px;
}

ion-segment {
  --background: rgba(255, 255, 255, 0.05);
  margin: 0 16px;
  width: calc(100% - 32px);
  border-radius: 12px;
  height: 44px;
}

ion-segment-button {
  --color-checked: #ffbf00;
  --indicator-color: transparent; /* Reset standard for custom look */
  --indicator-box-shadow: none;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.5px;
}

/* Premium Highlight for active segment */
ion-segment-button.segment-button-checked {
  background: rgba(255, 191, 0, 0.1);
  color: #ffbf00;
}

.notif-dot {
  width: 6px;
  height: 6px;
  min-width: 6px;
  border-radius: 50%;
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 0;
}

.admin-content {
  --background: #000;
}

.admin-section {
  padding: 16px;
}

/* Analytics Grid */
.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 1.5em;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border-radius: 14px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.65em;
  color: #888;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.stat-value {
  margin: 0;
  font-size: 1.4em;
  font-weight: 900;
  color: white;
}

.analytics-card {
  padding: 20px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1em;
  color: #ffbf00;
}

.status-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.row-label {
  color: #aaa;
  font-size: 0.9em;
}

.row-value {
  font-weight: 700;
  color: white;
}

.row-value.online { color: #2dd36f; }
.warning-text { color: #eb445a; }

.health-bar-container {
  height: 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
  margin: 15px 0 10px;
}

.health-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffbf00, #ff6b00);
  border-radius: 3px;
  box-shadow: 0 0 10px rgba(255, 191, 0, 0.4);
}

.health-text {
  font-size: 0.75em;
  color: #666;
}

/* Directory Section */
.directory-header {
  padding: 4px;
  margin-bottom: 16px;
}

.bee-item-row {
  --background: transparent;
  --padding-start: 12px;
  margin-bottom: 6px;
  border-radius: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
}

.bee-avatar {
  font-size: 20px;
  background: rgba(255,191,0,0.1);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  margin-right: 12px;
}

.bee-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bee-id-text {
  font-weight: 800;
  color: white;
}

.tiny-badge {
  font-size: 0.6em;
  padding: 2px 6px;
}

.found-user-card {
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 191, 0, 0.3);
}

/* Reports Section */
.empty-reports-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.report-card-wrapper {
  margin-bottom: 12px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
}

.report-card-item {
  --background: rgba(255,255,255,0.03);
  padding: 10px 0;
}

.report-badge {
  display: inline-block;
  background: rgba(255, 77, 77, 0.15);
  color: #ff4d4d;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.75em;
  font-weight: 800;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.report-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  color: #aaa;
  margin-bottom: 8px;
}

.report-date {
  font-size: 0.75em;
  color: #555;
  margin-bottom: 12px;
}

.report-actions-row {
  display: flex;
  gap: 10px;
}

.report-actions-row ion-button {
  flex: 1;
}

/* Glass & Animations */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
.animate-fade-in { animation: fadeIn 0.4s ease both; }

@keyframes pop {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
