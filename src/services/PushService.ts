import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ref } from 'vue';
import { useUserService } from './UserService';
import { useBuzzService } from './BuzzService';
import { useNotificationService } from './NotificationService';
import router from '@/router';
import { App as CapApp } from '@capacitor/app';
import { useCallService } from './CallService';


export const deviceToken = ref<string | null>(null);
export const isAppInForeground = ref<boolean>(true);

export const usePushService = () => {
    const { addReceivedBuzz } = useBuzzService();
    const { shouldNotify } = useNotificationService();

    const initPush = async () => {
        if (Capacitor.getPlatform() === 'web') {
            console.warn('Push Notifications not supported on web. Falling back to Local Notifications mock.');
            return;
        }

        // Track app state for better notification handling
        CapApp.addListener('appStateChange', ({ isActive }) => {
            isAppInForeground.value = isActive;
        });

        // 1. Request Push Permissions
        let pushPerms = await PushNotifications.checkPermissions();

        if (pushPerms.receive === 'prompt') {
            pushPerms = await PushNotifications.requestPermissions();
        }

        // 2. Request Local Notification Permissions (needed for Android 13+)
        let localPerms = await LocalNotifications.checkPermissions();
        if (localPerms.display === 'prompt') {
            await LocalNotifications.requestPermissions();
        }

        if (pushPerms.receive !== 'granted') {
            console.warn('User denied Push permissions.');
            return;
        }

        // 3. Add Listeners BEFORE Registering
        await PushNotifications.removeAllListeners();
        await LocalNotifications.removeAllListeners();

        // Create Channel for Android (Critical for Android 8.0+)
        if (Capacitor.getPlatform() === 'android') {
            await PushNotifications.createChannel({
                id: 'buzz_channel',
                name: 'Buzz Notifications',
                description: 'Notifications for incoming Bee buzzes',
                sound: 'buzz',
                importance: 5,
                visibility: 1,
                vibration: true
            });
        }

        // 3.5 Register Action Types for Calls
        await LocalNotifications.registerActionTypes({
            types: [
                {
                    id: 'CALL_ACTION',
                    actions: [
                        { id: 'answer', title: 'Answer Bee 🐝', foreground: true },
                        { id: 'reject', title: 'Reject', foreground: false, destructive: true }
                    ]
                }
            ]
        });


        PushNotifications.addListener('registration', async (token) => {
            deviceToken.value = token.value;

            const { userBeeId, saveUserProfile } = useUserService();
            if (userBeeId.value) {
                await saveUserProfile(userBeeId.value, token.value);
            }
        });

        // On registration error
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('❌ FCM Registration Error:', JSON.stringify(error));
        });

        // Handle incoming notifications while app is OPEN (foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            // NOTE: We do NOT call sendLocalBuzz here because the inbox listener in App.vue
            // already handles this for all incoming messages (BUZZ, VIBRATE, ROOM_BUZZ, etc.)
            // to prevent double notifications.

            // const sender = notification.data?.senderId || 'A Bee';
            // const message = notification.body || notification.data?.message || 'Buzz! 🐝';
            // const image = notification.data?.image;
            // const type = notification.data?.type;
            // sendLocalBuzz(sender, message, image, type);
        });

        // Handle notification click/action (when app is CLOSED or BACKGROUND)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            const sender = notification.notification.data?.senderId || 'A Bee';
            const message = notification.notification.body || notification.notification.data?.message || 'Buzz! 🐝';
            const image = notification.notification.data?.image;
            const type = notification.notification.data?.type;
            const roomId = notification.notification.data?.roomId;

            // Log to local history
            // NOTE: This IS needed for background/closed app because the inbox listener
            // may not be active or the message was already deleted from Firestore
            if (!type || type === 'BUZZ') {
                addReceivedBuzz(sender, message, image);
            }

            // Redirect based on type
            setTimeout(() => {
                if (type === 'ROOM_BUZZ' && roomId) {
                    router.push(`/tabs/tab1/room/${roomId}`);
                } else if (type === 'CALL_REQUEST') {
                    router.push('/call');
                } else {
                    router.push({ path: '/tabs/tab1', query: { openBee: sender } });
                }
            }, 500);

        });

        // Handle local notification click
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
            const extra = action.notification.extra;
            const sender = extra?.sender || action.notification.title?.replace('🐝 Buzz from ', '') || 'A Bee';
            const type = extra?.type;
            const roomId = extra?.roomId;

            const { answerCall, rejectCall } = useCallService();

            if (action.actionId === 'reject') {
                rejectCall();
                return;
            }

            if (action.actionId === 'answer') {
                router.push('/call');
                setTimeout(() => {
                    answerCall();
                }, 1000);
                return;
            }

            setTimeout(() => {
                if (type === 'ROOM_BUZZ' && roomId) {
                    router.push(`/tabs/tab1/room/${roomId}`);
                } else if (type === 'CALL_REQUEST') {
                    router.push('/call');
                } else {
                    router.push({ path: '/tabs/tab1', query: { openBee: sender } });
                }
            }, 500);

        });


        // 4. Finally Register with FCM/APNS
        await PushNotifications.register();
    };

    const sendLocalBuzz = async (sender: string, message: string, image?: string, type?: string, roomId?: string) => {
        // Respect Notification Settings
        if (!shouldNotify(type as any || 'BUZZ')) {
            return;
        }

        try {
            const notificationId = Math.floor(Math.random() * 100000);
            const isCall = type === 'CALL_REQUEST';

            // If it's a call, we want a distinctive sound and high priority
            const title = isCall
                ? `📞 ${sender} is calling you!`
                : (type === 'ROOM_BUZZ' ? `🐝 Hive Hub` : `🐝 Buzz from ${sender}`);

            const body = isCall ? `Ringing... (Swipe to Respond)` : message;

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id: notificationId,
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: 'buzz',
                        smallIcon: 'ic_stat_bee',
                        iconColor: '#ffbf00',
                        actionTypeId: isCall ? 'CALL_ACTION' : 'OPEN_BUZZ',
                        channelId: 'buzz_channel',
                        extra: {
                            sender,
                            message,
                            image: image || '',
                            type,
                            roomId
                        }
                    }
                ]
            });

        } catch (e) {
            console.error('❌ Local Notification Error:', e);
        }
    };

    const sendMissedCallNotification = async (sender: string) => {
        const { addNotification } = useNotificationService();
        try {
            // 1. Add to app's global notification list
            addNotification(sender, 'You missed a call', 'MISSED_CALL');

            // 2. Schedule local push notification
            const notificationId = Math.floor(Math.random() * 100000);
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: `🐝 Missed Buzz Call`,
                        body: `You missed a buzz call from @${sender}`,
                        id: notificationId,
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: 'buzz',
                        smallIcon: 'ic_stat_bee',
                        iconColor: '#ff4757', // Red for missed
                        channelId: 'buzz_channel',
                        extra: { sender, type: 'MISSED_CALL' }
                    }
                ]
            });
        } catch (e) {
            console.error('Error sending missed call Notification:', e);
        }
    };


    /**
     * Clear all delivered notifications (useful when user opens app)
     */
    const clearAllNotifications = async () => {
        try {
            await LocalNotifications.removeAllDeliveredNotifications();
            await PushNotifications.removeAllDeliveredNotifications();
        } catch (e) {
            console.error('Error clearing notifications:', e);
        }
    };

    /**
     * Get delivered notifications count
     */
    const getDeliveredNotificationsCount = async (): Promise<number> => {
        try {
            const delivered = await LocalNotifications.getDeliveredNotifications();
            return delivered.notifications.length;
        } catch (e) {
            console.error('Error getting notifications count:', e);
            return 0;
        }
    };

    return {
        initPush,
        sendLocalBuzz,
        sendMissedCallNotification,
        clearAllNotifications,
        getDeliveredNotificationsCount,
        deviceToken,
        isAppInForeground
    };
};
