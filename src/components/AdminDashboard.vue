<template>
  <div class="admin-dashboard">
    <div class="admin-header-main">
      <div class="admin-top-bar">
        <div class="title-with-pulse">
           <h1>Hive Control Center 🛡️</h1>
           <div class="live-indicator" title="Live Data Sync">
             <div class="dot"></div>
             <span>LIVE</span>
           </div>
        </div>
        <ion-button fill="clear" color="danger" @click="handleLogout" class="logout-btn">
          <ion-icon :icon="logOutOutline" slot="start"></ion-icon>
          LOGOUT
        </ion-button>
      </div>
      <div class="main-segment-wrapper">
        <ion-segment v-model="activeSegment" mode="ios" class="main-nav-segment">
          <ion-segment-button value="analytics" @click="loadAnalytics">
            <ion-icon :icon="barChartOutline"></ion-icon>
            <ion-label>Stats</ion-label>
          </ion-segment-button>
          <ion-segment-button value="directory">
            <ion-icon :icon="peopleOutline"></ion-icon>
            <ion-label>Bees</ion-label>
          </ion-segment-button>
          <ion-segment-button value="reports">
            <ion-icon :icon="alertCircleOutline"></ion-icon>
            <ion-label>Alerts</ion-label>
            <ion-badge v-if="reports.length > 0" color="danger" class="notif-dot"></ion-badge>
          </ion-segment-button>
          <ion-segment-button value="broadcast">
            <ion-icon :icon="megaphoneOutline"></ion-icon>
            <ion-label>Push</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </div>

    <!-- Analytics Dashboard Segment -->
    <div v-if="activeSegment === 'analytics'" class="admin-section analytics-view animate-fade-in">
      <div class="analytics-grid">
        <div class="stat-card glass-panel animate-pop" v-for="(stat, i) in statCards" :key="stat.label" :style="{ animationDelay: (i * 0.1) + 's' }">
          <div class="stat-icon" :style="{ color: stat.color }">{{ stat.icon }}</div>
          <div class="stat-data">
            <span class="stat-label">{{ stat.label }}</span>
            <h2 class="stat-value">{{ stat.value }}</h2>
          </div>
        </div>
      </div>

      <div class="analytics-charts-grid">
        <!-- Activity Pulse Chart -->
        <div class="chart-card glass-panel animate-pop" style="animation-delay: 0.3s">
          <div class="chart-header">
            <h3>Activity Pulse</h3>
            <span class="chart-badge">Live</span>
          </div>
          <div class="pulse-container">
            <div 
              v-for="(val, i) in activityPulse" 
              :key="i" 
              class="pulse-bar" 
              :style="{ 
                height: val + '%', 
                animationDelay: (i * 0.05) + 's',
                background: `linear-gradient(to top, #ffbf00, ${val > 80 ? '#2dd36f' : '#ffbf0088'})`
              }"
            ></div>
          </div>
          <div class="chart-labels">
            <span>Morning</span>
            <span>Noon</span>
            <span>Evening</span>
          </div>
        </div>

        <!-- Honey Harvest Growth -->
        <div class="chart-card glass-panel animate-pop" style="animation-delay: 0.4s">
          <div class="chart-header">
            <h3>Honey Harvest (Nectar)</h3>
            <span class="chart-badge secondary">24h Growth</span>
          </div>
          <div class="growth-bars">
            <div v-for="(day, i) in harvestHistory" :key="i" class="growth-item">
              <div class="bar-wrapper">
                <div class="bar-fill" :style="{ height: day.displayValue + '%' }">
                   <span class="bar-val">{{ day.raw }}</span>
                </div>
              </div>
              <span class="day-label">{{ day.label }}</span>
            </div>
          </div>
        </div>

        <!-- Daily Active Bees -->
        <div class="chart-card glass-panel animate-pop" style="animation-delay: 0.5s">
          <div class="chart-header">
            <h3>Daily Bee Traffic</h3>
            <span class="chart-badge success">7 Day DAU</span>
          </div>
          <div class="growth-bars">
            <div v-for="(day, i) in dailyActiveTrends" :key="i" class="growth-item">
              <div class="bar-wrapper">
                <div class="bar-fill" :style="{ height: day.displayValue + '%', background: 'linear-gradient(to top, #2dd36f, #81f7af)' }">
                   <span class="bar-val">{{ day.raw }}</span>
                </div>
              </div>
              <span class="day-label">{{ day.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="recent-activity-section glass-panel animate-pop" style="animation-delay: 0.6s">
        <div class="section-header">
          <h3>Colony Vitality</h3>
          <ion-icon :icon="flash" color="primary"></ion-icon>
        </div>
        <div class="status-list">
          <div class="status-item">
            <div class="status-indicator">
              <span class="status-dot online"></span>
              <div class="status-wave"></div>
            </div>
            <div class="status-details">
              <span class="status-title">Real-time Swarm Sync</span>
              <span class="status-text">100% Active connection to Firebase relay</span>
            </div>
          </div>
          <div class="status-item">
            <div class="status-indicator">
              <span class="status-dot" :class="{ online: (reports.length === 0), warning: (reports.length > 0) }"></span>
            </div>
            <div class="status-details">
              <span class="status-title">Moderation Queue</span>
              <span class="status-text">{{ reports.length }} pending tickets aggregated across {{ uniqueReportedCount }} entities</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bee Directory Segment -->
    <div v-if="activeSegment === 'directory'" class="admin-section directory-view animate-fade-in">
      <div class="search-container glass-panel">
        <ion-searchbar 
          placeholder="Lookup specific Bee..." 
          v-model="userSearchQuery"
          @ionChange="handleUserSearch"
          mode="ios"
          class="admin-searchbar"
        ></ion-searchbar>
      </div>

      <!-- Searched User View -->
      <div v-if="foundUser" class="user-card animate-pop glass-panel search-result">
         <div class="user-info">
          <div class="user-avatar-mini">🐝</div>
          <div class="user-details-text">
            <h3>{{ foundUser.beeId }}</h3>
            <p><ion-badge :color="getRoleColor(foundUser.role)">{{ foundUser.role || 'User' }}</ion-badge></p>
          </div>
        </div>
        <div class="user-actions-row">
           <ion-button v-if="isSuperAdmin && foundUser.role !== 'super_admin'" size="small" :color="foundUser.role === 'admin' ? 'warning' : 'secondary'" @click="foundUser.role === 'admin' ? handleDemote(foundUser.beeId) : handlePromote(foundUser.beeId)">
              {{ foundUser.role === 'admin' ? 'Demote' : 'Promote' }}
           </ion-button>
           <ion-button size="small" color="danger" @click="handleDeleteUser(foundUser.beeId)">Delete account</ion-button>
        </div>
      </div>

      <!-- Lazy Loaded List -->
      <ion-list class="bee-list" v-if="!userSearchQuery">
        <ion-item v-for="user in paginatedUsers" :key="user.beeId" class="bee-list-item glass-panel" @click="openUserOptions(user)">
          <div class="bee-mini-avatar">🐝</div>
          <ion-label>
            <div class="bee-row">
              <span class="bee-id">{{ user.beeId }}</span>
              <ion-badge v-if="user.role" :color="getRoleColor(user.role)" class="mini-role-badge">{{ user.role }}</ion-badge>
            </div>
            <p>Active {{ getRelativeTime(user.lastSeen) }}</p>
          </ion-label>
          <ion-icon :icon="chevronForwardOutline" slot="end" color="medium"></ion-icon>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll @ionInfinite="loadMoreUsers" v-if="!userSearchQuery && hasMore">
        <ion-infinite-scroll-content loading-spinner="crescent"></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </div>

    <!-- Reports Section -->
    <div v-if="activeSegment === 'reports'" class="admin-section reports-view animate-fade-in">
      <div v-if="reports.length === 0" class="empty-state">
        <div class="empty-icon">🛡️</div>
        <h3>The Hive is peaceful</h3>
        <p>No moderation tickets found.</p>
      </div>
      <ion-list v-else class="reports-list">
        <div v-for="report in reports" :key="report.id" class="report-card-wrapper">
          <ion-item-sliding class="report-sliding-item">
            <ion-item class="report-item glass-panel">
              <ion-label>
                <div class="report-header">
                  <div class="report-reasons-container">
                    <span v-for="r in Array.from(new Set(report.reasons || [report.reason]))" :key="(r as string)" class="report-reason-badge">{{ r }}</span>
                  </div>
                  <span class="report-time">{{ formatTime(report.timestamp) }}</span>
                </div>
                <div class="report-meta">
                   <p v-if="report.type === 'user_report'">Target Bee: <b>{{ report.targetBeeId }}</b></p>
                   <p v-else>To Author: <b>{{ report.authorId }}</b></p>
                   <p>By: <b>{{ Array.from(new Set(report.reporters || [report.reportedBy])).join(', ') }}</b></p>
                </div>
                <div class="report-actions">
                  <template v-if="report.type !== 'user_report'">
                    <ion-button size="small" fill="outline" class="preview-btn" @click="viewReportedStory(report)">PREVIEW</ion-button>
                    <ion-button size="small" color="danger" class="delete-btn" @click="handleDeleteStory(report.storyId)">DELETE</ion-button>
                  </template>
                  <template v-else>
                    <ion-button size="small" fill="outline" class="preview-btn" @click="router.push(`/tabs/profile/${report.targetBeeId}`)">PROFILE</ion-button>
                    <ion-button size="small" color="danger" class="delete-btn" @click="handleDeleteUser(report.targetBeeId)">BAN BEE</ion-button>
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
 
    <!-- Broadcast Section -->
    <div v-if="activeSegment === 'broadcast'" class="admin-section broadcast-view animate-fade-in">
      <div class="broadcast-card glass-panel animate-pop">
        <div class="card-header-icon">
          <ion-icon :icon="megaphoneOutline" color="primary"></ion-icon>
        </div>
        <h2>Global Swarm Message</h2>
        <p class="subtitle">This will be delivered as a Push Notification to ALL Bees in the Hive.</p>
        
        <div class="broadcast-form">
          <div class="input-group">
            <label>Notification Title</label>
            <input 
              type="text" 
              v-model="broadcastTitle" 
              placeholder="e.g. Hive Update 🍯" 
              class="glass-input" 
            />
          </div>
          <div class="input-group">
            <label>Message Content</label>
            <textarea 
              v-model="broadcastMessage" 
              placeholder="What do you want to tell the colony?" 
              class="glass-input" 
              rows="4"
            ></textarea>
          </div>
 
          <div class="warning-box">
             <ion-icon :icon="alertCircleOutline"></ion-icon>
             <span>Use this strategically. Excessive broadcasting can lead to uninstalls.</span>
          </div>
 
          <ion-button 
            expand="block" 
            color="primary" 
            class="broadcast-btn gold-glow" 
            :disabled="!broadcastTitle || !broadcastMessage || isBroadcasting"
            @click="confirmBroadcast"
          >
            <template v-if="!isBroadcasting">
              <ion-icon :icon="paperPlaneOutline" slot="start"></ion-icon>
              DEPLOY BROADCAST
            </template>
            <template v-else>
              <ion-spinner name="crescent"></ion-spinner>
              SENDING TO THE SWARM...
            </template>
          </ion-button>
        </div>
      </div>
 
      <div class="broadcast-history-preview glass-panel animate-pop" style="animation-delay: 0.2s">
         <h3>Broadcast Guidelines</h3>
         <ul>
           <li>Keep it short (under 100 chars for best display).</li>
           <li>Use emojis to increase interaction.</li>
           <li>Only send urgent or high-value updates.</li>
         </ul>
      </div>
    </div>

    <!-- Story Preview Modal -->
    <ion-modal :is-open="!!selectedReportedStory" @didDismiss="selectedReportedStory = null" class="admin-preview-modal">
      <div class="preview-modal-wrapper" v-if="selectedReportedStory">
        <div class="modal-header">
          <h2>Post Preview</h2>
          <ion-button fill="clear" @click="selectedReportedStory = null">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>
        <div class="preview-content">
          <img v-if="selectedReportedStory.imageUrl" :src="selectedReportedStory.imageUrl" class="preview-img" />
          <div v-else class="text-post" :style="{ backgroundColor: selectedReportedStory.backgroundColor || '#ffbf00' }">
            {{ selectedReportedStory.textContent }}
          </div>
          <div class="preview-meta">
            <span class="author-tag">Author: {{ selectedReportedStory.beeId }}</span>
          </div>
        </div>
        <div class="preview-footer">
           <ion-button expand="block" color="danger" @click="handleDeleteFromPreview" class="delete-btn-full">
             REMOVE FROM HIVE
           </ion-button>
        </div>
      </div>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { 
  IonList, IonItem, IonLabel, IonButton, IonBadge, IonSegment, IonSegmentButton,
  IonSearchbar, IonSpinner, IonItemSliding, IonItemOptions, IonItemOption, IonModal,
  alertController, toastController, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent,
  actionSheetController
} from '@ionic/vue';
import { 
  closeOutline, logOutOutline, chevronForwardOutline, schoolOutline, 
  alertCircleOutline, barChartOutline, pulseOutline, flash, megaphoneOutline,
  paperPlaneOutline, peopleOutline
} from 'ionicons/icons';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserService } from '@/services/UserService';
import { useMyDaysService } from '@/services/MyDaysService';
import { db } from '@/services/FirebaseService';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';

const { 
  isSuperAdmin, promoteToAdmin, demoteFromAdmin, adminDeleteUser, 
  getUserProfile, clearLocalData, getAdminAnalytics, getPagedUsers,
  sendGlobalBroadcast
} = useUserService();
const { adminDeleteStory } = useMyDaysService();
const router = useRouter();

const activeSegment = ref('analytics');
const reports = ref<any[]>([]);
const analytics = ref<any>(null);

// Directory state
const paginatedUsers = ref<any[]>([]);
const lastVisibleDoc = ref<any>(null);
const hasMore = ref(true);
const isSearching = ref(false);
const userSearchQuery = ref('');
const foundUser = ref<any>(null);

const selectedReportedStory = ref<any>(null);
 
// Broadcast state
const broadcastTitle = ref('');
const broadcastMessage = ref('');
const isBroadcasting = ref(false);

const statCards = computed(() => [
  { label: 'Total Bees', value: analytics.value?.totalUsers || 0, icon: '🐝', color: '#ffbf00' },
  { label: 'Active Now', value: analytics.value?.onlineUsers || 0, icon: '🟢', color: '#2dd36f' },
  { label: 'Cloud Nectar', value: analytics.value?.totalStories || 0, icon: '☁️', color: '#3dc2ff' },
  { label: 'Joined Today', value: analytics.value?.newUsersToday || 0, icon: '✨', color: '#ffd534' }
]);

const activityPulse = computed<number[]>(() => {
  const data: number[] = analytics.value?.activityPulse || [0,0,0,0,0,0,0,0,0,0,0,0];
  const max = Math.max(...data, 5); // Minimum scale of 5 for aesthetics
  return data.map((v: number) => (v / max) * 100);
});

const harvestHistory = computed(() => {
  const data = analytics.value?.harvestHistory || [
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 }
  ];
  const max = Math.max(...data.map((d: any) => d.value), 3); // Minimum scale of 3
  return data.map((d: any) => ({ 
    ...d, 
    displayValue: (d.value / max) * 100,
    raw: d.value 
  }));
});

const uniqueReportedCount = computed(() => {
  const ids = reports.value.map(r => r.type === 'user_report' ? r.targetBeeId : r.storyId);
  return new Set(ids).size;
});

const dailyActiveTrends = computed(() => {
  const data = analytics.value?.dailyActiveHistory || [
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 },
    { label: '...', value: 0 }
  ];
  const max = Math.max(...data.map((d: any) => d.value), 3);
  return data.map((d: any) => ({
    ...d,
    displayValue: (d.value / max) * 100,
    raw: d.value
  }));
});

onMounted(async () => {
  // Listen for reports
  const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snap) => {
    reports.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });

  loadAnalytics();
  loadInitialUsers();
});

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
  const actionSheet = await actionSheetController.create({
    header: `Manage ${user.beeId}`,
    buttons: [
      {
        text: user.role === 'admin' ? 'Demote from Admin' : 'Promote to Admin',
        icon: schoolOutline,
        handler: () => {
          user.role === 'admin' ? handleDemote(user.beeId) : handlePromote(user.beeId);
        }
      },
      {
        text: 'Delete Account',
        role: 'destructive',
        icon: closeOutline,
        handler: () => handleDeleteUser(user.beeId)
      },
      { text: 'Cancel', role: 'cancel' }
    ]
  });
  await actionSheet.present();
};

const handlePromote = async (beeId: string) => {
  const alert = await alertController.create({
    header: 'Promote Bee',
    message: `Make ${beeId} an admin?`,
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
    message: `Remove admin status from ${beeId}?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Confirm', handler: async () => { await demoteFromAdmin(beeId); loadInitialUsers(); if (foundUser.value) handleUserSearch(); } }
    ]
  });
  await alert.present();
};

const handleDeleteUser = async (beeId: string) => {
  const alert = await alertController.create({
    header: 'Permanently Delete Account',
    message: `Warning: This cannot be undone. Delete ${beeId}?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'DELETE', role: 'destructive', handler: async () => { await adminDeleteUser(beeId); foundUser.value = null; loadInitialUsers(); } }
    ]
  });
  await alert.present();
};

const viewReportedStory = async (report: any) => {
  if (!report.storyId) return;
  const storyDoc = await getDoc(doc(db, 'stories', report.storyId));
  if (storyDoc.exists()) {
    selectedReportedStory.value = { id: storyDoc.id, ...storyDoc.data() };
  } else {
    const toast = await toastController.create({ message: 'Content already removed.', duration: 2000, color: 'warning' });
    await toast.present();
    await dismissReport(report.id);
  }
};

const handleDeleteStory = async (storyId: string) => {
  const alert = await alertController.create({
    header: 'Delete Content',
    message: 'Remove this nectar from the colony?',
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

const handleLogout = async () => {
  const alert = await alertController.create({
    header: 'Logout',
    message: 'Exit the Hive Control Center?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Logout', role: 'destructive', handler: async () => { await clearLocalData(); } }
    ]
  });
  await alert.present();
};
 
const confirmBroadcast = async () => {
  const alert = await alertController.create({
    header: 'Target the Entire Colony?',
    message: `You are about to send a push notification to EVERYONE. Are you sure?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { 
        text: 'YES, SEND IT', 
        handler: handleSendBroadcast 
      }
    ]
  });
  await alert.present();
};
 
const handleSendBroadcast = async () => {
  if (!broadcastTitle.value || !broadcastMessage.value) return;
  
  isBroadcasting.value = true;
  try {
    const result = await sendGlobalBroadcast(broadcastTitle.value, broadcastMessage.value);
    const toast = await toastController.create({
      message: `Success! Broadcast dispatched to ${result.count} bees. 🐝`,
      duration: 3000,
      color: 'success'
    });
    await toast.present();
    broadcastTitle.value = '';
    broadcastMessage.value = '';
  } catch (e) {
    const toast = await toastController.create({
      message: 'Failed to deploy broadcast. Check logs.',
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
  } finally {
    isBroadcasting.value = false;
  }
};
</script>

<style scoped>
.admin-dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
}

.admin-header-main {
  padding: 10px 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 191, 0, 0.15);
}

.admin-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
}

.admin-top-bar h1 {
  margin: 0;
  font-size: 1.3em;
  font-weight: 800;
  color: #ffbf00;
  letter-spacing: -0.5px;
}

.title-with-pulse {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.live-indicator .dot {
  width: 6px;
  height: 6px;
  background: #2dd36f;
  border-radius: 50%;
  box-shadow: 0 0 8px #2dd36f;
  animation: pulse-green 2s infinite;
}

.live-indicator span {
  font-size: 0.6em;
  font-weight: 900;
  color: #2dd36f;
  letter-spacing: 1px;
}

@keyframes pulse-green {
  0% { transform: scale(0.95); opacity: 0.8; }
  70% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.logout-btn {
  --color: #eb445a;
  font-weight: 800;
  font-size: 0.8em;
}

.main-segment-wrapper {
  padding: 0 16px 10px;
}

/* Polished Segment UI */
ion-segment {
  --background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  height: 44px;
}

ion-segment-button {
  --color-checked: #ffbf00;
  --indicator-color: transparent;
  font-weight: 700;
  font-size: 10px;
}

ion-segment-button ion-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

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
  top: 6px;
  right: 6px;
}

.admin-section {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* Analytics */
.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
}

.stat-data { display: flex; flex-direction: column; }
.stat-label { font-size: 0.65em; color: #888; text-transform: uppercase; font-weight: 800; }
.stat-value { margin: 0; font-size: 1.4em; font-weight: 900; color: white; }

.analytics-charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

@media (min-width: 768px) {
  .analytics-charts-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
}

.chart-badge.success {
  background: rgba(45, 211, 111, 0.2);
  color: #2dd36f;
}

.chart-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  font-size: 1em;
  font-weight: 800;
  color: #ffbf00;
}

.chart-badge {
  font-size: 0.6em;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(45, 211, 111, 0.2);
  color: #2dd36f;
  font-weight: 800;
  text-transform: uppercase;
}

.chart-badge.secondary {
  background: rgba(61, 194, 255, 0.2);
  color: #3dc2ff;
}

.pulse-container {
  height: 120px;
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.pulse-bar {
  flex: 1;
  border-radius: 4px 4px 0 0;
  transition: all 0.5s ease;
  animation: growVertical 0.8s ease-out both;
}

@keyframes growVertical {
  from { transform: scaleY(0); transform-origin: bottom; }
  to { transform: scaleY(1); transform-origin: bottom; }
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.65em;
  color: #666;
  font-weight: 700;
}

.growth-bars {
  height: 120px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 20px;
}

.growth-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.bar-wrapper {
  width: 12px;
  height: 100px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffbf00;
  border-radius: 10px;
  transition: height 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.bar-val {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6em;
  font-weight: 800;
  color: #ffbf00;
}

.day-label {
  margin-top: 8px;
  font-size: 0.6em;
  color: #888;
  font-weight: 700;
}

.recent-activity-section { padding: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.section-header h3 { font-size: 1.1em; color: #ffbf00; margin-top: 0; }
.status-list { display: flex; flex-direction: column; gap: 16px; }
.status-item { display: flex; align-items: flex-start; gap: 14px; }

.status-indicator { position: relative; width: 8px; height: 8px; margin-top: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #444; display: block; }
.status-dot.online { background: #2dd36f; }
.status-dot.warning { background: #eb445a; }

.status-wave {
  position: absolute;
  top: 0; left: 0;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #2dd36f;
  animation: ripple 2s infinite;
}

@keyframes ripple {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(4); opacity: 0; }
}

.status-details { display: flex; flex-direction: column; gap: 2px; }
.status-title { font-size: 0.9em; font-weight: 800; color: white; }
.status-text { font-size: 0.75em; color: #aaa; line-height: 1.4; }

/* Directory */
.bee-list-item {
  --background: transparent;
  margin-bottom: 8px;
  border-radius: 15px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
}

.bee-mini-avatar {
  font-size: 20px;
  background: rgba(255,191,0,0.1);
  padding: 10px;
  border-radius: 12px;
  margin-right: 12px;
}

.bee-row { display: flex; align-items: center; gap: 8px; }
.bee-id { font-weight: 800; color: white; }

/* Reports */
.report-card-wrapper {
  margin-bottom: 12px;
  border-radius: 15px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
}

.report-item { --background: transparent; padding: 10px 0; }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.report-reason-badge { background: rgba(255,77,77,0.15); color: #ff4d4d; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 0.75em; text-transform: uppercase; }
.report-meta p { margin: 4px 0; font-size: 0.9em; color: #aaa; }
.report-actions { display: flex; gap: 10px; margin-top: 15px; }
.report-actions ion-button { flex: 1; }

/* Glass & Utils */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
.animate-fade-in { animation: fadeIn 0.4s ease both; }

@keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
 
/* Broadcast Styles */
.broadcast-view {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}
 
.broadcast-card {
  padding: 30px;
  text-align: center;
  margin-bottom: 20px;
}
 
.card-header-icon {
  font-size: 40px;
  margin-bottom: 15px;
}
 
.broadcast-card h2 {
  margin: 0;
  color: #fff;
  font-weight: 900;
}
 
.broadcast-card .subtitle {
  color: #888;
  font-size: 0.9em;
  margin: 8px 0 25px;
}
 
.broadcast-form {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
 
.input-group label {
  display: block;
  font-size: 0.75em;
  font-weight: 800;
  color: #ffbf00;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
 
.glass-input {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 14px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
}
 
.glass-input:focus {
  border-color: #ffbf00;
  background: rgba(255,255,255,0.08);
}
 
.warning-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(235, 68, 90, 0.1);
  border: 1px solid rgba(235, 68, 90, 0.2);
  padding: 12px;
  border-radius: 10px;
  color: #eb445a;
  font-size: 0.8em;
  font-weight: 600;
}
 
.warning-box ion-icon {
  font-size: 20px;
}
 
.broadcast-btn {
  height: 56px;
  --border-radius: 14px;
  margin-top: 10px;
}
 
.broadcast-history-preview {
  padding: 20px;
}
 
.broadcast-history-preview h3 {
  margin-top: 0;
  font-size: 1em;
  color: #fff;
  font-weight: 800;
}
 
.broadcast-history-preview ul {
  margin: 10px 0 0;
  padding-left: 20px;
  color: #aaa;
  font-size: 0.85em;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
