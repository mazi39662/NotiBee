<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab1"></ion-back-button>
        </ion-buttons>
        <ion-title>Leaderboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="leaderboard-content" :scroll-y="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content 
          :pulling-icon="chevronDownCircleOutline"
          pulling-text="Pull to refresh"
          refreshing-spinner="crescent"
          refreshing-text="Updating rankings...">
        </ion-refresher-content>
      </ion-refresher>

      <div class="leaderboard-header">
        <div class="header-title">
          <h1>🏆 Honey Harvest</h1>
          <p>Ranked by lifetime Honey Drops collected</p>
        </div>

        <!-- Your Rank Card -->
        <div v-if="userRank" class="your-rank-card glass-panel gold-glow">
          <div class="rank-badge">
            <span class="rank-number">#{{ userRank.rank }}</span>
          </div>
          <div class="rank-details">
            <h3>{{ userRank.beeId }}</h3>
            <div class="rank-stats">
              <span>💧 {{ userRank.honeyDrops }} Honey Drops</span>
              <span>🍯 {{ userRank.lifetimeJars }} jars</span>
              <span>🔥 {{ userRank.currentStreak }} streak</span>
            </div>
          </div>
          <div class="rank-trophy">
            <span v-if="userRank.rank === 1">👑</span>
            <span v-else-if="userRank.rank <= 3">🏆</span>
            <span v-else-if="userRank.rank <= 10">🥇</span>
            <span v-else>🐝</span>
          </div>
        </div>
      </div>

      <div class="leaderboard-body">
        <!-- Top 3 Podium -->
        <div v-if="topThree.length > 0" class="podium">
          <!-- 2nd Place -->
          <div v-if="topThree[1]" class="podium-item second">
            <div class="podium-avatar">
              <span class="bee-emoji">🐝</span>
              <div class="medal silver">🥈</div>
            </div>
            <div class="podium-info">
              <h3>{{ topThree[1].beeId }}</h3>
              <p>{{ topThree[1].honeyDrops }} Honey Drops</p>
            </div>
            <div class="podium-stand">
              <div class="stand-number">2</div>
            </div>
          </div>

          <!-- 1st Place -->
          <div v-if="topThree[0]" class="podium-item first">
            <div class="podium-avatar">
              <span class="bee-emoji king">🐝</span>
              <div class="medal gold">👑</div>
            </div>
            <div class="podium-info">
              <h3>{{ topThree[0].beeId }}</h3>
              <p>{{ topThree[0].honeyDrops }} Honey Drops</p>
            </div>
            <div class="podium-stand">
              <div class="stand-number">1</div>
            </div>
          </div>

          <!-- 3rd Place -->
          <div v-if="topThree[2]" class="podium-item third">
            <div class="podium-avatar">
              <span class="bee-emoji">🐝</span>
              <div class="medal bronze">🥉</div>
            </div>
            <div class="podium-info">
              <h3>{{ topThree[2].beeId }}</h3>
              <p>{{ topThree[2].honeyDrops }} Honey Drops</p>
            </div>
            <div class="podium-stand">
              <div class="stand-number">3</div>
            </div>
          </div>
        </div>

        <!-- Rest of Leaderboard -->
        <div class="leaderboard-list">
          <h2 class="list-title">All Rankings</h2>
          <div 
            v-for="entry in leaderboardEntries" 
            :key="entry.beeId"
            :class="['leaderboard-entry glass-panel', { 
              'is-you': entry.beeId === userBeeId,
              'top-ten': entry.rank <= 10 
            }]"
            @click="router.push(`/tabs/profile/${entry.beeId}`)"
            style="cursor: pointer;"
          >
            <div class="entry-rank">
              <span class="rank-text">#{{ entry.rank }}</span>
            </div>
            <div class="entry-avatar">
              <span class="bee-emoji">🐝</span>
            </div>
            <div class="entry-details">
              <h3>
                {{ entry.beeId }}
                <span v-if="entry.beeId === userBeeId" class="you-badge">YOU</span>
              </h3>
              <div class="entry-stats">
                <span class="stat-item">
                  <ion-icon :icon="water" class="drop-icon"></ion-icon>
                  {{ entry.honeyDrops }}
                </span>
                <span class="stat-item">
                  <ion-icon :icon="flameOutline"></ion-icon>
                  {{ entry.currentStreak }}
                </span>
                <span class="stat-item">
                  <ion-icon :icon="trophyOutline"></ion-icon>
                  {{ entry.achievements }}
                </span>
              </div>
            </div>
            <div class="entry-badge">
              <span v-if="entry.rank === 1">👑</span>
              <span v-else-if="entry.rank === 2">🥈</span>
              <span v-else-if="entry.rank === 3">🥉</span>
              <span v-else-if="entry.rank <= 10">⭐</span>
              <span v-if="entry.lifetimeJars >= 10" class="mini-jar">🍯</span>
            </div>
          </div>

          <div v-if="leaderboardEntries.length === 0" class="empty-state">
            <span class="empty-icon">🏆</span>
            <h3>No drops collected</h3>
            <p>Start interacting with Nectar to climb the leaderboard!</p>
          </div>
        </div>
      </div>

      <!-- Extra spacing for tab bar and smoother scrolling -->
      <div class="footer-spacer"></div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-overlay">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading leaderboard...</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent
} from '@ionic/vue';
import { 
  trophyOutline, 
  flameOutline, 
  water,
  chevronDownCircleOutline
} from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useStreakService } from '@/services/StreakService';
import { useUserService } from '@/services/UserService';
import { useRouter } from 'vue-router';

const { getLeaderboard, syncUserStats } = useStreakService();
const { userBeeId } = useUserService();
const router = useRouter();

const entries = ref<any[]>([]);
const loading = ref(true);
let unsubscribe: (() => void) | null = null;

const topThree = computed(() => entries.value.slice(0, 3));
const leaderboardEntries = computed(() => entries.value);
const userRank = computed(() => entries.value.find(e => e.beeId === userBeeId.value));

onMounted(() => {
  // Auto-sync stats in background when leaderboard is viewed
  if (userBeeId.value) {
    syncUserStats(userBeeId.value).catch(console.error);
  }

  const result = getLeaderboard();
  unsubscribe = result.unsubscribe;
  
  // Watch the ref from the service
  watch(result.leaderboard, (newVal: any[]) => {
    entries.value = newVal;
    if (newVal.length >= 0) loading.value = false;
  }, { immediate: true });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const handleRefresh = async (event: any) => {
  if (userBeeId.value) {
    await syncUserStats(userBeeId.value).catch(console.error);
  }
  // Data updates automatically via the unsubscribe/watch logic
  setTimeout(() => {
    event.target.complete();
  }, 1000);
};
</script>

<style scoped>
.leaderboard-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.leaderboard-header {
  padding: 20px;
  padding-top: 10px;
}

.header-title {
  text-align: center;
  margin-bottom: 20px;
}

.header-title h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  color: #fff;
}

.header-title p {
  margin: 8px 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

/* Your Rank Card */
.your-rank-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 191, 0, 0.1);
  border: 2px solid rgba(255, 191, 0, 0.3);
  margin-bottom: 20px;
}

.rank-badge {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffbf00, #ff9500);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(255, 191, 0, 0.4);
}

.rank-number {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a2e;
}

.rank-details {
  flex: 1;
}

.rank-details h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.rank-stats {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.rank-trophy {
  font-size: 36px;
}

/* Podium */
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 120px;
}

.podium-avatar {
  position: relative;
  margin-bottom: 12px;
}

.bee-emoji {
  font-size: 48px;
  display: block;
}

.bee-emoji.king {
  font-size: 56px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.medal {
  position: absolute;
  bottom: -8px;
  right: -8px;
  font-size: 24px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.podium-info {
  text-align: center;
  margin-bottom: 12px;
}

.podium-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.podium-info p {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.podium-stand {
  width: 100%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border-radius: 8px 8px 0 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
}

.podium-item.first .podium-stand {
  height: 100px;
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.1));
  border-color: rgba(255, 215, 0, 0.5);
}

.podium-item.second .podium-stand {
  height: 80px;
  background: linear-gradient(180deg, rgba(192, 192, 192, 0.3), rgba(192, 192, 192, 0.1));
  border-color: rgba(192, 192, 192, 0.5);
}

.podium-item.third .podium-stand {
  height: 60px;
  background: linear-gradient(180deg, rgba(205, 127, 50, 0.3), rgba(205, 127, 50, 0.1));
  border-color: rgba(205, 127, 50, 0.5);
}

.stand-number {
  font-size: 32px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.3);
}

/* Leaderboard List */
.leaderboard-body {
  padding: 0 20px 40px;
}

.list-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaderboard-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.leaderboard-entry.is-you {
  background: rgba(255, 191, 0, 0.1);
  border-color: rgba(255, 191, 0, 0.3);
  box-shadow: 0 0 20px rgba(255, 191, 0, 0.2);
}

.leaderboard-entry.top-ten {
  border-color: rgba(255, 191, 0, 0.2);
}

.entry-rank {
  width: 40px;
  text-align: center;
}

.rank-text {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}

.entry-avatar {
  font-size: 32px;
}

.entry-details {
  flex: 1;
}

.entry-details h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.you-badge {
  background: #ffbf00;
  color: #1a1a2e;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

.entry-stats {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-item ion-icon {
  font-size: 14px;
}

.entry-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 24px;
}

.mini-jar {
  font-size: 16px;
}

.drop-icon {
  color: #ffbf00;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 80px;
  display: block;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.empty-state p {
  margin: 8px 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 46, 0.9);
  z-index: 100;
}

.loading-overlay p {
  margin-top: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

/* Glass Panel Effect */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.gold-glow {
  box-shadow: 0 0 30px rgba(255, 191, 0, 0.3);
}

.footer-spacer {
  height: 100px;
  width: 100%;
}
</style>
