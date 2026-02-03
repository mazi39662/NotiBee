import { ref } from 'vue';
import { db } from './FirebaseService';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp,
    updateDoc,
    doc,
    increment
} from 'firebase/firestore';
import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';

// Real AdMob Unit IDs
const BANNER_UNIT_ID = 'ca-app-pub-4440713684746844/7187343268';
const INTERSTITIAL_UNIT_ID = 'ca-app-pub-4440713684746844/5647370190';
const REWARDED_UNIT_ID = 'ca-app-pub-4440713684746844/5344117860';
// Native Unit (Stored for future native advanced implementation)
const NATIVE_UNIT_ID = 'ca-app-pub-4440713684746844/1321112375';

export interface Ad {
    id: string;
    beeId: string; // Brand Name
    imageUrl?: string;
    imageUrls?: string[];
    caption: string;
    ctaLabel?: string;
    ctaUrl?: string;
    isAd: true;
    createdAt: number;
    expiresAt: number;
    likes: string[];
    views: string[];
    comments: any[];
    backgroundColor?: string;
    textContent?: string;
    provider?: 'firestore' | 'admob';
}

const ads = ref<Ad[]>([]);
const isAdMobInitialized = ref(false);

export function useAdService() {

    const initializeAdMob = async () => {
        try {
            await AdMob.initialize();
            isAdMobInitialized.value = true;
            console.log('AdMob Initialized');

            // Show banner immediately after initialization
            showBanner();
        } catch (e) {
            console.warn('AdMob Initialization failed (likely not on mobile)', e);
        }
    };

    /**
     * Show a bottom banner ad
     */
    const showBanner = async () => {
        try {
            await AdMob.showBanner({
                adId: BANNER_UNIT_ID,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: false // SET TO FALSE FOR PRODUCTION
            });
        } catch (e) {
            console.error('Banner Ad failed', e);
        }
    };

    /**
     * Fetch real ads from Firestore
     */
    const fetchAds = async () => {
        try {
            const now = Date.now();
            const q = query(
                collection(db, 'ads'),
                where('expiresAt', '>', Timestamp.fromMillis(now))
            );

            const snapshot = await getDocs(q);
            const fetchedAds: Ad[] = [];

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                fetchedAds.push({
                    id: docSnap.id,
                    beeId: data.beeId,
                    imageUrl: data.imageUrl,
                    imageUrls: data.imageUrls || [],
                    caption: data.caption,
                    ctaLabel: data.ctaLabel,
                    ctaUrl: data.ctaUrl,
                    isAd: true,
                    createdAt: data.createdAt.toMillis(),
                    expiresAt: data.expiresAt.toMillis(),
                    likes: data.likes || [],
                    views: data.views || [],
                    comments: data.comments || [],
                    backgroundColor: data.backgroundColor,
                    textContent: data.textContent,
                    provider: 'firestore'
                });
            });

            ads.value = fetchedAds;
            return fetchedAds;
        } catch (error) {
            console.error('Error fetching real ads:', error);
            return [];
        }
    };

    const trackAdClick = async (adId: string) => {
        console.log(`Ad ${adId} clicked!`);
        try {
            const statsRef = doc(db, 'ad_stats', adId);
            await updateDoc(statsRef, {
                clicks: increment(1)
            }).catch(async () => {
                // If doc doesn't exist, create it
            });
        } catch (e) {
            // Silently fail
        }
    };

    const trackAdView = async (adId: string) => {
        console.log(`Ad ${adId} viewed!`);
        try {
            const statsRef = doc(db, 'ad_stats', adId);
            await updateDoc(statsRef, {
                views: increment(1)
            }).catch(() => { });
        } catch (e) { }
    };

    /**
     * Shows a full-screen Interstitial Ad
     * Best used during natural transitions (e.g. after posting a story)
     */
    const showInterstitial = async () => {
        try {
            await AdMob.prepareInterstitial({
                adId: INTERSTITIAL_UNIT_ID,
                isTesting: false // SET TO FALSE FOR PRODUCTION
            });
            await AdMob.showInterstitial();
        } catch (e) {
            console.error('Interstitial Ad failed', e);
        }
    };

    /**
     * Shows a Rewarded Video Ad
     * Used to give users Honey Jars/Drops in exchange for watching
     */
    const showRewarded = async (onComplete: () => void) => {
        try {
            await AdMob.prepareRewardVideoAd({
                adId: REWARDED_UNIT_ID,
                isTesting: false // SET TO FALSE FOR PRODUCTION
            });

            const reward = await AdMob.showRewardVideoAd();
            if (reward) {
                onComplete();
            }
        } catch (e) {
            console.error('Rewarded Ad failed', e);
        }
    };

    return {
        ads,
        fetchAds,
        trackAdClick,
        trackAdView,
        initializeAdMob,
        showBanner,
        showInterstitial,
        showRewarded
    };
}
