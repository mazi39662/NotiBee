import { ref, computed } from 'vue';
import { db } from './FirebaseService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { userBeeId } from './UserService';

const DROPS_PER_JAR = 30;
const honeyDrops = ref(Number(localStorage.getItem('honey_drops_count') || 0));
const honeyJars = ref(Number(localStorage.getItem('honey_jars_count') || 0));
const lifetimeJars = ref(Number(localStorage.getItem('lifetime_jars_count') || 0));
const lifetimeHoneyDrops = ref(Number(localStorage.getItem('lifetime_honey_drops_count') || 0));
const unlockedRevelations = ref<string[]>(JSON.parse(localStorage.getItem('unlocked_revelations') || '[]'));

export const useHoneyService = () => {

    /**
     * Add honey drops for interactions
     */
    const addHoneyDrops = async (type: 'VIEW' | 'COMMENT' | 'POLLINATE') => {
        if (!userBeeId.value) return;

        let dropsToAdd = 1;
        if (type === 'COMMENT') dropsToAdd = 3;
        if (type === 'POLLINATE') dropsToAdd = 2;

        await addBulkHoneyDrops(dropsToAdd);
    };

    /**
     * Bulk add honey drops (e.g. for rewards)
     */
    const addBulkHoneyDrops = async (count: number) => {
        if (!userBeeId.value || count <= 0) return;

        honeyDrops.value += count;
        lifetimeHoneyDrops.value += count;

        if (honeyDrops.value >= DROPS_PER_JAR) {
            const newJars = Math.floor(honeyDrops.value / DROPS_PER_JAR);
            honeyJars.value += newJars;
            lifetimeJars.value += newJars;
            honeyDrops.value %= DROPS_PER_JAR;
        }

        saveToLocal();
        await syncToFirestore();
    };

    /**
     * Directly add full honey jars (e.g. for rewarded ads)
     */
    const addHoneyJar = async (count: number = 1) => {
        if (!userBeeId.value) return;

        honeyJars.value += count;
        lifetimeJars.value += count;

        saveToLocal();
        await syncToFirestore();
    };

    const consumeJar = async (targetId: string): Promise<boolean> => {
        if (honeyJars.value > 0 && !unlockedRevelations.value.includes(targetId)) {
            honeyJars.value--;
            unlockedRevelations.value.push(targetId);
            saveToLocal();
            await syncToFirestore();
            return true;
        }
        return false;
    };

    const isRevealed = (targetId: string): boolean => {
        return unlockedRevelations.value.includes(targetId);
    };

    const syncToFirestore = async () => {
        if (!userBeeId.value) return;
        try {
            const userRef = doc(db, 'users', userBeeId.value);
            await updateDoc(userRef, {
                totalHoneyJars: honeyJars.value,
                lifetimeJars: lifetimeJars.value,
                lifetimeHoneyDrops: lifetimeHoneyDrops.value,
                unlockedRevelations: unlockedRevelations.value
            });

            const { checkAchievements } = await import('./StreakService').then(m => m.useStreakService());
            await checkAchievements(userBeeId.value);
        } catch (e) {
            console.error('Failed to sync honey data:', e);
        }
    };

    const loadFromFirestore = async () => {
        if (!userBeeId.value) return;
        try {
            const userDoc = await getDoc(doc(db, 'users', userBeeId.value));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.totalHoneyJars !== undefined) honeyJars.value = data.totalHoneyJars;
                if (data.lifetimeJars !== undefined) lifetimeJars.value = data.lifetimeJars;
                if (data.lifetimeHoneyDrops !== undefined) lifetimeHoneyDrops.value = data.lifetimeHoneyDrops;
                if (data.unlockedRevelations) unlockedRevelations.value = data.unlockedRevelations;
                saveToLocal();
            }
        } catch (e) {
            console.error('Failed to load honey data:', e);
        }
    };

    const saveToLocal = () => {
        localStorage.setItem('honey_drops_count', honeyDrops.value.toString());
        localStorage.setItem('honey_jars_count', honeyJars.value.toString());
        localStorage.setItem('lifetime_jars_count', lifetimeJars.value.toString());
        localStorage.setItem('lifetime_honey_drops_count', lifetimeHoneyDrops.value.toString());
        localStorage.setItem('unlocked_revelations', JSON.stringify(unlockedRevelations.value));
    };

    const jarProgress = computed(() => (honeyDrops.value / DROPS_PER_JAR) * 100);

    return {
        honeyDrops,
        honeyJars,
        lifetimeJars,
        lifetimeHoneyDrops,
        jarProgress,
        unlockedRevelations,
        addHoneyDrops,
        addBulkHoneyDrops,
        addHoneyJar,
        consumeJar,
        isRevealed,
        loadFromFirestore
    };
};
