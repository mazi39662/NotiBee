import { ref } from 'vue';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface Reminder {
    id: number;
    title: string;
    description: string;
    type: 'one-time' | 'daily' | 'custom-dates';
    time: string; // "HH:mm"
    dates: string[]; // ISO date strings
    enabled: boolean;
    createdAt: number;
}

const STORAGE_KEY = 'notibee_reminders';

const reminders = ref<Reminder[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

export const useReminderService = () => {

    const saveReminders = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders.value));
    };

    const scheduleNotification = async (reminder: Reminder) => {
        if (!reminder.enabled) return;

        const [hours, minutes] = reminder.time.split(':').map(Number);
        const notifications: any[] = [];

        if (reminder.type === 'one-time') {
            const dateStr = reminder.dates[0];
            const date = new Date(dateStr);
            date.setHours(hours, minutes, 0, 0);

            if (date.getTime() > Date.now()) {
                notifications.push({
                    id: reminder.id,
                    title: `🐝 Buzz Reminder: ${reminder.title}`,
                    body: reminder.description,
                    schedule: { at: date },
                    sound: 'beep.wav', // or default
                    extra: { reminderId: reminder.id }
                });
            }
        } else if (reminder.type === 'daily') {
            notifications.push({
                id: reminder.id,
                title: `🐝 Buzz Reminder: ${reminder.title}`,
                body: reminder.description,
                schedule: {
                    on: {
                        hour: hours,
                        minute: minutes
                    },
                    allowWhileIdle: true,
                    every: 'day'
                },
                extra: { reminderId: reminder.id }
            });
        } else if (reminder.type === 'custom-dates') {
            // Capacitor doesn't support multiple specific dates in one schedule easily
            // We'll schedule multiple notifications with slightly different IDs or handle them as separate entries
            // For simplicity in this service, we'll use a base ID + index
            reminder.dates.forEach((dateStr, index) => {
                const date = new Date(dateStr);
                date.setHours(hours, minutes, 0, 0);

                if (date.getTime() > Date.now()) {
                    notifications.push({
                        id: reminder.id + index, // Note: this might cause collisions if IDs are close
                        title: `🐝 Buzz Reminder: ${reminder.title}`,
                        body: reminder.description,
                        schedule: { at: date },
                        extra: { reminderId: reminder.id }
                    });
                }
            });
        }

        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
        }
    };

    const cancelNotification = async (reminder: Reminder) => {
        // Cancel base ID
        const ids = [reminder.id];
        if (reminder.type === 'custom-dates') {
            // Cancel potential multi-date IDs (up to 365 for safety or based on actual dates length)
            for (let i = 1; i < reminder.dates.length; i++) {
                ids.push(reminder.id + i);
            }
        }
        await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
    };

    const addReminder = async (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
        const id = Math.floor(Math.random() * 1000000); // Use large random for unique int ID
        const newReminder: Reminder = {
            ...reminder,
            id,
            createdAt: Date.now()
        };

        reminders.value.push(newReminder);
        saveReminders();

        if (newReminder.enabled) {
            await scheduleNotification(newReminder);
        }

        return newReminder;
    };

    const deleteReminder = async (id: number) => {
        const reminder = reminders.value.find(r => r.id === id);
        if (reminder) {
            await cancelNotification(reminder);
            reminders.value = reminders.value.filter(r => r.id !== id);
            saveReminders();
        }
    };

    const toggleReminder = async (id: number) => {
        const index = reminders.value.findIndex(r => r.id === id);
        if (index !== -1) {
            const reminder = reminders.value[index];
            reminder.enabled = !reminder.enabled;

            if (reminder.enabled) {
                await scheduleNotification(reminder);
            } else {
                await cancelNotification(reminder);
            }

            saveReminders();
        }
    };

    const init = async () => {
        const status = await LocalNotifications.requestPermissions();
        if (status.display === 'granted') {
            // Optional: Reschedule all enabled reminders to ensure they are set
            // for (const reminder of reminders.value) {
            //     if (reminder.enabled) await scheduleNotification(reminder);
            // }
        }

        // Setup listener for received notifications to trigger vibration
        LocalNotifications.addListener('localNotificationReceived', async (notification) => {
            await Haptics.impact({ style: ImpactStyle.Heavy });
            // Vibrating multiple times as requested "Vibrate the phone"
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 200);
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 400);
        });
    };

    return {
        reminders,
        addReminder,
        deleteReminder,
        toggleReminder,
        init
    };
};
