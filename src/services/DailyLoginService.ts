import { ref, computed } from 'vue';
import { db } from './FirebaseService';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { userBeeId } from './UserService';
import { useHoneyService } from './HoneyService';

export interface DailyLoginData {
    lastClaimDate: string; // YYYY-MM-DD
    currentStreak: number; // 1 to 30
    lastClaimMonth: number; // 0-11
}

const loginData = ref<DailyLoginData>({
    lastClaimDate: '',
    currentStreak: 0,
    lastClaimMonth: -1
});

const isClaimedToday = ref(false);

// Reward schedule based on the plan
const REWARDS: Record<number, number> = {};
for (let i = 1; i <= 5; i++) REWARDS[i] = 5;
for (let i = 6; i <= 10; i++) REWARDS[i] = 10;
for (let i = 11; i <= 15; i++) REWARDS[i] = 20;
for (let i = 16; i <= 20; i++) REWARDS[i] = 30;
for (let i = 21; i <= 25; i++) REWARDS[i] = 45;
for (let i = 26; i <= 28; i++) REWARDS[i] = 60;
REWARDS[29] = 90;
REWARDS[30] = 120;

export const useDailyLoginService = () => {
    const honeyService = useHoneyService();

    const getTodayString = () => new Date().toISOString().split('T')[0];
    const getYesterdayString = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    };
    const getCurrentMonth = () => new Date().getMonth();

    const initLoginData = async () => {
        if (!userBeeId.value || userBeeId.value === 'superadmin') return;

        try {
            const loginRef = doc(db, 'users', userBeeId.value, 'private', 'dailyLogin');
            const snap = await getDoc(loginRef);

            const today = getTodayString();
            const yesterday = getYesterdayString();
            const currentMonth = getCurrentMonth();

            if (snap.exists()) {
                const data = snap.data() as DailyLoginData;

                // 1. Check if month changed
                if (data.lastClaimMonth !== currentMonth) {
                    loginData.value = {
                        lastClaimDate: data.lastClaimDate,
                        currentStreak: 0, // Reset for new month
                        lastClaimMonth: currentMonth
                    };
                }
                // 2. Check if a day was missed
                else if (data.lastClaimDate !== today && data.lastClaimDate !== yesterday) {
                    loginData.value = {
                        lastClaimDate: data.lastClaimDate,
                        currentStreak: 0, // Reset because missed a day
                        lastClaimMonth: currentMonth
                    };
                }
                else {
                    loginData.value = data;
                }

                isClaimedToday.value = loginData.value.lastClaimDate === today;
            } else {
                // First time ever
                loginData.value = {
                    lastClaimDate: '',
                    currentStreak: 0,
                    lastClaimMonth: currentMonth
                };
                isClaimedToday.value = false;

                // Create the doc
                await setDoc(loginRef, loginData.value);
            }
        } catch (e) {
            console.error('Failed to init daily login data:', e);
        }
    };

    const claimReward = async () => {
        if (!userBeeId.value || userBeeId.value === 'superadmin' || isClaimedToday.value) return null;

        const today = getTodayString();
        const currentMonth = getCurrentMonth();

        // Increment streak (max 30)
        const newStreak = Math.min(loginData.value.currentStreak + 1, 30);
        const rewardAmount = REWARDS[newStreak] || 5;

        try {
            const loginRef = doc(db, 'users', userBeeId.value, 'private', 'dailyLogin');

            const updatedData: DailyLoginData = {
                lastClaimDate: today,
                currentStreak: newStreak,
                lastClaimMonth: currentMonth
            };

            await updateDoc(loginRef, updatedData as any);

            // Update local state
            loginData.value = updatedData;
            isClaimedToday.value = true;

            // Add actual honey drops
            // We'll need to modify HoneyService or use its internal logic
            // Since addHoneyDrops usually takes a type, we might want a raw add function
            // But we can just manually update for now if HoneyService doesn't have a bulk add
            // or just call addHoneyDrops in a loop (not efficient) or directly modify.

            // I'll add a helper to HoneyService to add specific amount
            await honeyService.addBulkHoneyDrops(rewardAmount);
            return { streak: newStreak, reward: rewardAmount };
        } catch (e) {
            console.error('Failed to claim daily reward:', e);
            return null;
        }
    };

    return {
        loginData,
        isClaimedToday,
        REWARDS,
        initLoginData,
        claimReward
    };
};
