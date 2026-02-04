import { db } from './FirebaseService';
import { doc, getDoc } from 'firebase/firestore';
import { alertController } from '@ionic/vue';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Current App Version (Should match package.json but we use this as source of truth for UI)
export const APP_VERSION = '2.0.4';

// Replace with your actual package ID when you have it on Play Store
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.notibee.app';

export const useUpdateService = () => {

    const checkForUpdate = async () => {
        // Skip check on web if needed, but usually good to keep for PWA
        // if (Capacitor.getPlatform() === 'web') return;

        try {

            // 1. Fetch latest version info from Firestore
            // Path: app_config/version
            const configDocPath = doc(db, 'app_config', 'version');
            const snap = await getDoc(configDocPath);

            if (!snap.exists()) {
                console.warn('⚠️ Update config not found in Firestore at app_config/version');
                return;
            }

            const data = snap.data();
            const latestVersion = data.latest; // e.g. "2.1.0"
            const isForce = data.force || false;
            const customMessage = data.message;

            // 2. Compare versions
            if (isNewerVersion(latestVersion, APP_VERSION)) {
                await showUpdateAlert(latestVersion, isForce, customMessage);
            } else {
            }
        } catch (e) {
            console.error('❌ Update check failed:', e);
        }
    };

    /**
     * Simple semantic version comparison
     * Returns true if 'latest' is greater than 'current'
     */
    const isNewerVersion = (latest: string, current: string): boolean => {
        if (!latest || !current) return false;

        const latestParts = latest.split('.').map(Number);
        const currentParts = current.split('.').map(Number);

        for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
            const l = latestParts[i] || 0;
            const c = currentParts[i] || 0;
            if (l > c) return true;
            if (l < c) return false;
        }
        return false;
    };

    const showUpdateAlert = async (newVersion: string, isForce: boolean, customMessage?: string) => {
        const buttons: any[] = [
            {
                text: 'Update Now 🍯',
                cssClass: 'update-button-confirm',
                handler: () => {
                    window.open(PLAY_STORE_URL, '_system');
                    // If it's a force update, returning false keeps the alert open
                    return !isForce;
                }
            }
        ];

        if (!isForce) {
            buttons.unshift({
                text: 'Later',
                role: 'cancel',
                cssClass: 'update-button-cancel'
            });
        }

        const alert = await alertController.create({
            header: 'New Buzz Available! 🐝',
            subHeader: `Version ${newVersion} is ready`,
            message: customMessage || 'A new version of NotiBee is available with improvements and new features. Update now to keep the hive healthy!',
            backdropDismiss: !isForce,
            cssClass: 'custom-alert update-alert',
            buttons: buttons
        });

        await alert.present();
    };

    return {
        checkForUpdate,
        APP_VERSION
    };
};
