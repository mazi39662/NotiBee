import { ref, computed } from 'vue';
import { db } from './FirebaseService';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    orderBy,
    limit,
    Timestamp,
    deleteDoc,
    increment,
    addDoc,
    writeBatch
} from 'firebase/firestore';

export interface Streak {
    userId: string;
    friendId: string;
    currentStreak: number;
    longestStreak: number;
    lastBuzzDate: string; // ISO date string (YYYY-MM-DD)
    streakFreezeUsed: boolean;
    totalBuzzes: number;
    createdAt: string;
    updatedAt: string;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    requirement: number;
    type: 'streak' | 'buzzes' | 'friends' | 'special' | 'jars';
    unlockedAt?: string;
}

export interface LeaderboardEntry {
    beeId: string;
    totalBuzzes: number;
    honeyDrops: number;
    lifetimeJars: number;
    longestStreak: number;
    currentStreak: number;
    achievements: number;
    rank: number;
}

// Predefined achievements
const ACHIEVEMENTS: Achievement[] = [
    { id: 'first_buzz', name: 'First Buzz', description: 'Send your first buzz', icon: '🐝', requirement: 1, type: 'buzzes' },
    { id: 'social_bee', name: 'Social Bee', description: 'Add 5 friends to your hive', icon: '👥', requirement: 5, type: 'friends' },
    { id: 'social_butterfly', name: 'Social Butterfly', description: 'Add 15 friends to your hive', icon: '🦋', requirement: 15, type: 'friends' },
    { id: 'community_leader', name: 'Community Leader', description: 'Add 30 friends to your hive', icon: '🏰', requirement: 30, type: 'friends' },
    { id: 'hive_hero', name: 'Hive Hero', description: 'Add 50 friends to your hive', icon: '👑', requirement: 50, type: 'friends' },
    { id: 'buzzy_bee', name: 'Buzzy Bee', description: 'Send 50 buzzes', icon: '⚡', requirement: 50, type: 'buzzes' },
    { id: 'chatterbox', name: 'Chatterbox', description: 'Send 100 buzzes', icon: '💬', requirement: 100, type: 'buzzes' },
    { id: 'buzz_master', name: 'Buzz Master', description: 'Send 500 buzzes', icon: '👑', requirement: 500, type: 'buzzes' },
    { id: 'honey_harvester_1', name: 'Nectar Collector', description: 'Fill your first Honey Jar', icon: '🍯', requirement: 1, type: 'jars' },
    { id: 'honey_harvester_5', name: 'Busy Gatherer', description: 'Fill 5 Honey Jars', icon: '🧺', requirement: 5, type: 'jars' },
    { id: 'honey_harvester_10', name: 'Honey Master', description: 'Fill 10 Honey Jars', icon: '🏺', requirement: 10, type: 'jars' },
    { id: 'honey_harvester_25', name: 'Hive Tycoon', description: 'Fill 25 Honey Jars', icon: '🏛️', requirement: 25, type: 'jars' },
    { id: 'honey_harvester_50', name: 'Golden Guardian', description: 'Fill 50 Honey Jars', icon: '👑', requirement: 50, type: 'jars' },

    // Honey Drop achievements
    { id: 'drops_100', name: 'Sweet Progress', description: 'Collect 100 Honey Drops', icon: '💧', requirement: 100, type: 'jars' },
    { id: 'drops_500', name: 'Honey Ocean', description: 'Collect 500 Honey Drops', icon: '🌊', requirement: 500, type: 'jars' },
    { id: 'drops_1000', name: 'Liquid Gold', description: 'Collect 1,000 Honey Drops', icon: '✨', requirement: 1000, type: 'jars' },

    // Streak achievements
    { id: 'streak_3', name: '3 Day Streak', description: 'Maintain a 3-day streak', icon: '🔥', requirement: 3, type: 'streak' },
    { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🌟', requirement: 7, type: 'streak' },
    { id: 'streak_14', name: 'Two Week Wonder', description: 'Maintain a 14-day streak', icon: '✨', requirement: 14, type: 'streak' },
    { id: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: '🏆', requirement: 30, type: 'streak' },
    { id: 'streak_50', name: 'Fifty Days Strong', description: 'Maintain a 50-day streak', icon: '💪', requirement: 50, type: 'streak' },
    { id: 'streak_100', name: 'Century Club', description: 'Maintain a 100-day streak', icon: '💯', requirement: 100, type: 'streak' },
    { id: 'streak_365', name: 'Year of Buzzing', description: 'Maintain a 365-day streak', icon: '🎉', requirement: 365, type: 'streak' },

    // Special achievements
    { id: 'night_owl', name: 'Night Owl', description: 'Send a buzz between 12 AM - 5 AM', icon: '🦉', requirement: 1, type: 'special' },
    { id: 'early_bird', name: 'Early Bird', description: 'Send a buzz between 5 AM - 7 AM', icon: '🌅', requirement: 1, type: 'special' },
];

const userStreaks = ref<Map<string, Streak>>(new Map());
const userAchievements = ref<Achievement[]>([]);
const leaderboard = ref<LeaderboardEntry[]>([]);

export const useStreakService = () => {

    /**
     * Get today's date in YYYY-MM-DD format
     */
    const getTodayDateString = (): string => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    /**
     * Get yesterday's date in YYYY-MM-DD format
     */
    const getYesterdayDateString = (): string => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    };

    /**
     * Update streak after a buzz is sent
     * DISTRIBUTED: Updates BOTH users' streak subcollections
     */
    const updateStreak = async (userId: string, friendId: string): Promise<void> => {
        const today = getTodayDateString();
        const yesterday = getYesterdayDateString();

        // References for both users
        const myStreakRef = doc(db, 'users', userId, 'streaks', friendId);
        const friendStreakRef = doc(db, 'users', friendId, 'streaks', userId);

        // We only really need to read ONE to determine logic (they should be synced)
        // But let's read mine to be safe
        const streakDoc = await getDoc(myStreakRef);

        const userRef = doc(db, 'users', userId);

        // Always increment total buzzes on the user doc for leaderboard
        await updateDoc(userRef, {
            totalBuzzes: increment(1)
        });

        const newStreakData = (currentData: Streak | undefined): Streak => {
            const isNew = !currentData;
            const data = currentData || {
                userId, // Note: This field is less relevant in distributed, but kept for interface compat
                friendId,
                currentStreak: 0,
                longestStreak: 0,
                lastBuzzDate: '',
                streakFreezeUsed: false,
                totalBuzzes: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                consecutiveDays: 0 // Internal field
            } as any;

            if (data.lastBuzzDate === today) {
                return {
                    ...data,
                    totalBuzzes: (data.totalBuzzes || 0) + 1,
                    updatedAt: new Date().toISOString()
                };
            }

            const isStreakLost = !isNew && data.lastBuzzDate !== yesterday;
            let consecutiveDays = data.consecutiveDays || (data.currentStreak >= 3 ? data.currentStreak : 0);

            if (!isStreakLost) {
                consecutiveDays += 1;
            } else {
                consecutiveDays = 1;
            }

            // Calculate displayed streak: 0 for days 1-2, then show consecutive days from day 3+
            const displayedStreak = consecutiveDays < 3 ? 0 : consecutiveDays;

            return {
                ...data, // Keep other fields
                currentStreak: displayedStreak,
                longestStreak: displayedStreak, // No historical record for pairs logic kept simple
                lastBuzzDate: today,
                consecutiveDays: consecutiveDays,
                totalBuzzes: (data.totalBuzzes || 0) + (isStreakLost ? 1 : 1),
                updatedAt: new Date().toISOString()
            };
        };

        const currentData = streakDoc.exists() ? (streakDoc.data() as Streak) : undefined;
        const updatedData = newStreakData(currentData);

        const batch = writeBatch(db);

        // Update MY copy
        batch.set(myStreakRef, { ...updatedData, userId: userId, friendId: friendId });

        // Update FRIEND'S copy (reciprocal)
        batch.set(friendStreakRef, { ...updatedData, userId: friendId, friendId: userId });

        await batch.commit();

        // Sync local user stats
        const stats = await syncUserStats(userId);
        await checkAchievements(userId, updatedData.currentStreak, stats.totalBuzzes);
    };

    /**
     * Get streak for a specific friend
     * Now checks my local subcollection
     */
    const getStreakWithFriend = async (userId: string, friendId: string): Promise<Streak | null> => {
        const streakRef = doc(db, 'users', userId, 'streaks', friendId);
        const streakSnap = await getDoc(streakRef);
        return streakSnap.exists() ? streakSnap.data() as Streak : null;
    };

    /**
     * Get all streaks for a user
     * Now queries only my subcollection
     */
    const getUserStreaks = (userId: string) => {
        const CACHE_KEY = `notibee_streaks_${userId}`;
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        const streaks = ref<Streak[]>(cached);

        // Query subcollection
        const q = query(collection(db, 'users', userId, 'streaks'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach((doc: any) => {
                const data = doc.data() as Streak;
                // In distributed model, 'friendId' in the doc should be correct,
                // but ID of the doc IS the friendId
                userStreaks.value.set(doc.id, { ...data, friendId: doc.id });
            });
            streaks.value = Array.from(userStreaks.value.values());
            localStorage.setItem(CACHE_KEY, JSON.stringify(streaks.value));
        });

        return { streaks, unsubscribe };
    };

    /**
     * Check and unlock achievements
     */
    const checkAchievements = async (userId: string, streakParam?: number, buzzesParam?: number) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return;

            const data = userDoc.data();
            const unlockedAchievements = data.achievements || [];
            const friendsCount = (data.friends || []).length;
            const currentStreak = streakParam ?? (data.currentStreak || 0);
            const totalBuzzes = buzzesParam ?? (data.totalBuzzes || 0);

            const newAchievements: string[] = [];

            ACHIEVEMENTS.forEach(a => {
                if (unlockedAchievements.includes(a.id)) return;

                if (a.type === 'streak' && currentStreak >= a.requirement) newAchievements.push(a.id);
                if (a.type === 'buzzes' && totalBuzzes >= a.requirement) newAchievements.push(a.id);
                if (a.type === 'friends' && friendsCount >= a.requirement) newAchievements.push(a.id);
                if (a.type === 'jars') {
                    const lifetimeJars = data.lifetimeJars || 0;
                    const lifetimeHoneyDrops = data.lifetimeHoneyDrops || 0;
                    if (a.id.startsWith('honey_harvester_') && lifetimeJars >= a.requirement) newAchievements.push(a.id);
                    if (a.id.startsWith('drops_') && lifetimeHoneyDrops >= a.requirement) newAchievements.push(a.id);
                }

                // Special check for time-based achievements
                if (a.type === 'special') {
                    const hour = new Date().getHours();
                    if (a.id === 'night_owl' && (hour >= 0 && hour < 5)) newAchievements.push(a.id);
                    if (a.id === 'early_bird' && (hour >= 5 && hour < 7)) newAchievements.push(a.id);
                }
            });

            if (newAchievements.length > 0) {
                const updates: any = { achievements: [...unlockedAchievements, ...newAchievements] };
                newAchievements.forEach(id => { updates[`achievementDates.${id}`] = new Date().toISOString(); });
                await updateDoc(userRef, updates);

                // Get user token for background notification
                const userSnap = await getDoc(userRef);
                const userData = userSnap.data();
                const pushToken = userData?.pushToken;

                // Notify user for each new achievement
                for (const id of newAchievements) {
                    const achievement = ACHIEVEMENTS.find(a => a.id === id);
                    if (achievement) {
                        const title = `🏆 Badge Earned: ${achievement.name}!`;
                        const body = `You've unlocked a new trophy: ${achievement.icon}`;

                        try {
                            // 1. Foreground (Inbox)
                            const inboxRef = collection(db, 'users', userId, 'inbox');
                            await addDoc(inboxRef, {
                                from: 'NotiBee',
                                message: `${title} ${achievement.icon}`,
                                type: 'ACHIEVEMENT',
                                timestamp: new Date().toISOString()
                            });

                            // 2. Background (Dispatch)
                            if (pushToken) {
                                const dispatchRef = collection(db, 'dispatch');
                                await addDoc(dispatchRef, {
                                    to: pushToken,
                                    title: title,
                                    body: body,
                                    data: {
                                        type: 'ACHIEVEMENT',
                                        achievementId: id
                                    },
                                    timestamp: new Date().toISOString()
                                });
                            }
                        } catch (e) {
                            console.error('Error sending achievement notification:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking achievements:', error);
        }
    };

    /**
     * Get user achievements
     */
    const getUserAchievements = (userId: string) => {
        const CACHE_KEY = `notibee_achievements_${userId}`;
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        const achievements = ref<Achievement[]>(cached);

        const userRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                achievements.value = ACHIEVEMENTS.map(a => ({
                    ...a,
                    unlockedAt: (data.achievements || []).includes(a.id) ? (data.achievementDates || {})[a.id] : undefined
                }));
                userAchievements.value = achievements.value;
                localStorage.setItem(CACHE_KEY, JSON.stringify(achievements.value));
            }
        });
        return { achievements, unsubscribe };
    };

    /**
     * Get leaderboard (Rank by totalBuzzes on user doc)
     */
    const getLeaderboard = () => {
        const CACHE_KEY = `notibee_leaderboard`;
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        const entries = ref<LeaderboardEntry[]>(cached);
        // Primary metric: Honey Drops
        const q = query(collection(db, 'users'), orderBy('lifetimeHoneyDrops', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            entries.value = snapshot.docs.map((doc, index) => {
                const data = doc.data();
                return {
                    beeId: data.beeId,
                    totalBuzzes: data.totalBuzzes || 0,
                    honeyDrops: data.lifetimeHoneyDrops || 0,
                    lifetimeJars: data.lifetimeJars || 0,
                    longestStreak: data.longestStreak || 0,
                    currentStreak: data.currentStreak || 0,
                    achievements: (data.achievements || []).length,
                    rank: index + 1
                };
            });
            leaderboard.value = entries.value;
            localStorage.setItem(CACHE_KEY, JSON.stringify(entries.value));
        });

        return { leaderboard: entries, unsubscribe };
    };

    /**
     * Sync user global stats by aggregating all their streaks
     */
    const syncUserStats = async (userId: string) => {
        try {
            // Only need to query my own subcollection now
            const q = query(collection(db, 'users', userId, 'streaks'));
            const snap = await getDocs(q);

            let totalBuzzes = 0;
            let maxCurrentStreak = 0;

            snap.docs.forEach(d => {
                const data = d.data() as Streak;
                totalBuzzes += (data.totalBuzzes || 0);
                maxCurrentStreak = Math.max(maxCurrentStreak, data.currentStreak || 0);
            });

            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                totalBuzzes,
                longestStreak: maxCurrentStreak, // Use max current as best
                currentStreak: maxCurrentStreak,
                updatedAt: new Date().toISOString()
            });

            return { totalBuzzes, longestStreak: maxCurrentStreak };
        } catch (error) {
            console.error('Error syncing user stats:', error);
            throw error;
        }
    };

    const cleanupExpiredStreaks = async () => { };
    const getAllAchievements = () => ACHIEVEMENTS;
    const getStreakCount = (friendId: string): number => userStreaks.value.get(friendId)?.currentStreak || 0;

    return {
        updateStreak,
        getStreakWithFriend,
        getUserStreaks,
        getUserAchievements,
        getLeaderboard,
        syncUserStats,
        cleanupExpiredStreaks,
        getAllAchievements,
        getStreakCount,
        checkAchievements,
        userStreaks,
        userAchievements,
        leaderboard
    };
};
