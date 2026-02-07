<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab3"></ion-back-button>
        </ion-buttons>
        <ion-title>Achievements & Streaks</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="achievements-content">
      <div class="achievements-header">
        <div class="header-stats glass-panel">
          <div class="stat-item">
            <div class="stat-icon">🏆</div>
            <div class="stat-details">
              <h3>{{ unlockedCount }}</h3>
              <p>Unlocked</p>
            </div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-icon">🔥</div>
            <div class="stat-details">
              <h3>{{ longestStreak }}</h3>
              <p>Longest Streak</p>
            </div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-icon">⚡</div>
            <div class="stat-details">
              <h3>{{ totalBuzzes }}</h3>
              <p>Total Buzzes</p>
            </div>
          </div>
        </div>
      </div>

      <div class="achievements-body">
        <!-- Streak Milestones Section -->
        <div class="section">
          <h2 class="section-title">
            <ion-icon :icon="flameOutline"></ion-icon>
            Streak Milestones
          </h2>
          <div class="milestones-grid">
            <div 
              v-for="milestone in streakMilestones" 
              :key="milestone.days"
              :class="['milestone-card', { 
                'unlocked': milestone.unlocked,
                'next': milestone.isNext,
                'pulsing-aura-premium': milestone.isNext
              }]"
            >
              <div class="milestone-icon">
                <span class="icon-emoji">{{ milestone.icon }}</span>
                <div v-if="milestone.unlocked" class="unlock-badge">✓</div>
              </div>
              <div class="milestone-info">
                <h3>{{ milestone.days }} Days</h3>
                <p>{{ milestone.name }}</p>
              </div>
              <div v-if="milestone.isNext" class="next-badge">NEXT</div>
            </div>
          </div>
        </div>

        <!-- All Achievements Section -->
        <div class="section">
          <h2 class="section-title">
            <ion-icon :icon="trophyOutline"></ion-icon>
            All Achievements
          </h2>
          
          <!-- Filter Tabs -->
          <div class="filter-tabs">
            <button 
              v-for="filter in filters" 
              :key="filter.value"
              :class="['filter-tab', { active: selectedFilter === filter.value }]"
              @click="selectedFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>

          <!-- Achievements List -->
          <div class="achievements-list">
            <div 
              v-for="achievement in filteredAchievements" 
              :key="achievement.id"
              :class="['achievement-card glass-panel', { 
                'unlocked': achievement.unlockedAt,
                'locked': !achievement.unlockedAt,
                'pulsing-aura-premium': isNewAchievement(achievement)
              }]"
            >
              <div class="achievement-icon">
                <span :class="['icon-emoji', { 'grayscale': !achievement.unlockedAt }]">
                  {{ achievement.icon }}
                </span>
              </div>
              <div class="achievement-details">
                <h3>{{ achievement.name }}</h3>
                <p>{{ achievement.description }}</p>
                <div v-if="achievement.unlockedAt" class="unlock-date">
                  Unlocked {{ formatDate(achievement.unlockedAt) }}
                </div>
                <div v-else class="requirement">
                  {{ getRequirementText(achievement) }}
                </div>
              </div>
              <div v-if="achievement.unlockedAt" class="unlock-checkmark">
                <ion-icon :icon="checkmarkCircle" color="success"></ion-icon>
              </div>
            </div>

            <div v-if="filteredAchievements.length === 0" class="empty-state">
              <span class="empty-icon">🎯</span>
              <p>No achievements in this category yet</p>
            </div>
          </div>
        </div>
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
  IonIcon
} from '@ionic/vue';
import { 
  trophyOutline, 
  flameOutline, 
  checkmarkCircle 
} from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStreakService } from '@/services/StreakService';
import { useUserService } from '@/services/UserService';

const { getUserAchievements, getAllAchievements, getUserStreaks } = useStreakService();
const { userBeeId } = useUserService();

const achievements = ref<any[]>([]);
const streaks = ref<any[]>([]);
const selectedFilter = ref('all');
let achievementsUnsubscribe: (() => void) | null = null;
let streaksUnsubscribe: (() => void) | null = null;

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Streaks', value: 'streak' },
  { label: 'Buzzes', value: 'buzzes' },
  { label: 'Social', value: 'friends' },
  { label: 'Special', value: 'special' }
];

// Streak milestones configuration
const streakMilestones = computed(() => {
  const milestones = [
    { days: 3, name: '3 Day Streak', icon: '🔥', unlocked: false, isNext: false },
    { days: 7, name: 'Week Warrior', icon: '🌟', unlocked: false, isNext: false },
    { days: 14, name: 'Two Week Wonder', icon: '✨', unlocked: false, isNext: false },
    { days: 30, name: 'Monthly Master', icon: '🏆', unlocked: false, isNext: false },
    { days: 50, name: 'Fifty Days Strong', icon: '💪', unlocked: false, isNext: false },
    { days: 100, name: 'Century Club', icon: '💯', unlocked: false, isNext: false },
    { days: 365, name: 'Year of Buzzing', icon: '🎉', unlocked: false, isNext: false }
  ];

  const maxStreak = longestStreak.value;
  let nextFound = false;

  return milestones.map(milestone => {
    const unlocked = maxStreak >= milestone.days;
    const isNext = !nextFound && !unlocked;
    if (isNext) nextFound = true;
    
    return {
      ...milestone,
      unlocked,
      isNext
    };
  });
});

const filteredAchievements = computed(() => {
  if (selectedFilter.value === 'all') {
    return achievements.value;
  }
  return achievements.value.filter(a => a.type === selectedFilter.value);
});

const unlockedCount = computed(() => {
  return achievements.value.filter(a => a.unlockedAt).length;
});

const longestStreak = computed(() => {
  if (streaks.value.length === 0) return 0;
  return Math.max(...streaks.value.map(s => s.longestStreak || 0));
});

const totalBuzzes = computed(() => {
  return streaks.value.reduce((sum, s) => sum + (s.totalBuzzes || 0), 0);
});

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

const getRequirementText = (achievement: any) => {
  switch (achievement.type) {
    case 'streak':
      return `Reach a ${achievement.requirement}-day streak`;
    case 'buzzes':
      return `Send ${achievement.requirement} buzzes`;
    case 'friends':
      return `Add ${achievement.requirement} friends`;
    case 'special':
      return achievement.description;
    default:
      return '';
  }
};


const isNewAchievement = (achievement: any) => {
  if (!achievement.unlockedAt) return false;
  const unlockedDate = new Date(achievement.unlockedAt);
  const now = new Date();
  const diffHours = Math.abs(now.getTime() - unlockedDate.getTime()) / (1000 * 60 * 60);
  return diffHours < 24; // New if unlocked in the last 24 hours
};

onMounted(() => {
  if (userBeeId.value) {
    // Load achievements
    const { achievements: userAchievements, unsubscribe: unsubAchievements } = getUserAchievements(userBeeId.value);
    achievements.value = getAllAchievements();
    achievementsUnsubscribe = unsubAchievements;

    // Watch for updates
    const watchAchievements = () => {
      achievements.value = getAllAchievements().map(achievement => {
        const userAchievement = userAchievements.value.find(a => a.id === achievement.id);
        return userAchievement || achievement;
      });
    };
    
    // Initial load
    setTimeout(watchAchievements, 500);
    
    // Set up watcher
    const interval = setInterval(watchAchievements, 2000);
    onUnmounted(() => clearInterval(interval));

    // Load streaks
    const { streaks: userStreaks, unsubscribe: unsubStreaks } = getUserStreaks(userBeeId.value);
    streaksUnsubscribe = unsubStreaks;
    
    const watchStreaks = () => {
      streaks.value = userStreaks.value;
    };
    setTimeout(watchStreaks, 500);
    const streakInterval = setInterval(watchStreaks, 2000);
    onUnmounted(() => clearInterval(streakInterval));
  }
});

onUnmounted(() => {
  if (achievementsUnsubscribe) achievementsUnsubscribe();
  if (streaksUnsubscribe) streaksUnsubscribe();
});
</script>

<style scoped>
.achievements-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.achievements-header {
  padding: 20px;
  padding-top: 10px;
}

.header-stats {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 2px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

.stat-details h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #ffbf00;
  line-height: 1;
}

.stat-details p {
  margin: 4px 0 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 700;
  white-space: nowrap;
}

.stat-divider {
  width: 1px;
  height: 50px;
  background: rgba(255, 255, 255, 0.05);
  align-self: center;
}

.achievements-body {
  padding: 0 20px 40px;
}

.section {
  margin-bottom: 30px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}

.section-title ion-icon {
  font-size: 24px;
  color: #ffbf00;
}

/* Milestones Grid */
.milestones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.milestone-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s ease;
}

.milestone-card.unlocked {
  background: rgba(255, 191, 0, 0.1);
  border-color: rgba(255, 191, 0, 0.3);
}



.milestone-card.next {
  border-color: #ffbf00;
  box-shadow: 0 0 20px rgba(255, 191, 0, 0.4);
}

.milestone-icon {
  position: relative;
  font-size: 40px;
  margin-bottom: 8px;
}

.unlock-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
  background: #4caf50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
}

.milestone-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.milestone-info p {
  margin: 4px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.next-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ffbf00;
  color: #1a1a2e;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.filter-tab {
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.filter-tab.active {
  background: #ffbf00;
  color: #1a1a2e;
  border-color: #ffbf00;
}

/* Achievements List */
.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.achievement-card.unlocked {
  background: rgba(255, 191, 0, 0.08);
  border-color: rgba(255, 191, 0, 0.2);
}

.achievement-card.locked {
  opacity: 0.6;
}

.achievement-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.icon-emoji.grayscale {
  filter: grayscale(100%);
  opacity: 0.5;
}

.achievement-details {
  flex: 1;
}

.achievement-details h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.achievement-details p {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.unlock-date {
  margin-top: 6px;
  font-size: 11px;
  color: #4caf50;
  font-weight: 600;
}

.requirement {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 191, 0, 0.8);
  font-weight: 600;
}

.unlock-checkmark {
  font-size: 28px;
  color: #4caf50;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 16px;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

/* Glass Panel Effect */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
