import { ref, computed } from 'vue';

export interface NotificationPreferences {
    doNotDisturb: boolean;
    notifyBuzzes: boolean;
    notifyVibrations: boolean;
    notifyFriendRequests: boolean;
}

export interface AppNotification {
    id: string;
    type: 'BUZZ' | 'VIBRATE' | 'FRIEND_REQUEST' | 'AUDIO' | 'ROOM_BUZZ' | 'SYSTEM' | 'REACTION';
    from: string;
    message: string;
    timestamp: number;
    read: boolean;
}

const PREFS_KEY = 'notibee_notification_prefs';
const NOTIFS_KEY = 'notibee_app_notifications';

const defaultPrefs: NotificationPreferences = {
    doNotDisturb: false,
    notifyBuzzes: true,
    notifyVibrations: true,
    notifyFriendRequests: true
};

const prefs = ref<NotificationPreferences>(JSON.parse(localStorage.getItem(PREFS_KEY) || JSON.stringify(defaultPrefs)));
const notifications = ref<AppNotification[]>(JSON.parse(localStorage.getItem(NOTIFS_KEY) || '[]'));

export const useNotificationService = () => {

    const updatePrefs = (newPrefs: Partial<NotificationPreferences>) => {
        prefs.value = { ...prefs.value, ...newPrefs };
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs.value));
    };

    const toggleDND = (enabled: boolean) => {
        updatePrefs({ doNotDisturb: enabled });
    };

    const shouldNotify = (type: 'BUZZ' | 'VIBRATE' | 'FRIEND_REQUEST' | 'AUDIO' | 'ROOM_BUZZ' | 'REACTION') => {
        if (prefs.value.doNotDisturb) return false;

        switch (type) {
            case 'BUZZ':
            case 'AUDIO':
            case 'ROOM_BUZZ':
                return prefs.value.notifyBuzzes;
            case 'VIBRATE':
                return prefs.value.notifyVibrations;
            case 'FRIEND_REQUEST':
                return prefs.value.notifyFriendRequests;
            default: return true;
        }
    };

    const addNotification = (from: string, message: string, type: AppNotification['type']) => {
        const newNotif: AppNotification = {
            id: Math.random().toString(36).substring(2, 9),
            from,
            message,
            type,
            timestamp: Date.now(),
            read: false
        };

        notifications.value = [newNotif, ...notifications.value].slice(0, 100); // Keep last 100
        saveNotifications();
    };

    const markAllAsRead = () => {
        notifications.value = notifications.value.map(n => ({ ...n, read: true }));
        saveNotifications();
    };

    const markAsRead = (id: string) => {
        const notif = notifications.value.find(n => n.id === id);
        if (notif) {
            notif.read = true;
            saveNotifications();
        }
    };

    const clearNotifications = () => {
        notifications.value = [];
        saveNotifications();
    };

    const saveNotifications = () => {
        localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifications.value));
    };

    const unreadCount = computed(() => notifications.value.filter(n => !n.read).length);

    return {
        prefs,
        notifications,
        unreadCount,
        updatePrefs,
        toggleDND,
        shouldNotify,
        addNotification,
        markAllAsRead,
        markAsRead,
        clearNotifications
    };
};
