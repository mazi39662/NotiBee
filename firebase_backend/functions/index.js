const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * 🐝 Enhanced Background Push Notification System
 * 
 * This function triggers when a new message is added to a user's inbox.
 * It sends a push notification to wake up the app even when closed.
 * The inbox document is NOT deleted here - it's handled by the app's listener.
 */
exports.onInboxMessage = functions.firestore
    .document('users/{userId}/inbox/{messageId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const userId = context.params.userId;
        const messageId = context.params.messageId;

        console.log(`📬 New inbox message for ${userId}:`, messageId);

        try {
            // Get the recipient's user document to fetch their FCM token
            const userDoc = await admin.firestore()
                .collection('users')
                .doc(userId)
                .get();

            if (!userDoc.exists) {
                console.error(`User ${userId} not found`);
                return null;
            }

            const userData = userDoc.data();
            const fcmToken = userData.fcmToken || userData.pushToken;

            if (!fcmToken) {
                console.log(`No FCM token for user ${userId}. Skipping push notification.`);
                return null;
            }

            // Prepare the notification payload
            const messageType = data.type || 'BUZZ';
            const sender = data.from || 'A Bee';
            const message = data.message || 'Buzz! 🐝';

            let notificationTitle = `🐝 Buzz from ${sender}`;
            let notificationBody = message;

            if (messageType === 'VIBRATE') {
                notificationTitle = `⚡ ${sender} vibrated your device!`;
                notificationBody = 'Tap to open';
            }

            const payload = {
                notification: {
                    title: notificationTitle,
                    body: notificationBody,
                    sound: 'buzz.wav', // Custom sound
                    icon: 'ic_stat_bee',
                    color: '#ffbf00',
                    tag: `buzz_${sender}`, // Group notifications from same sender
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                },
                data: {
                    senderId: String(sender),
                    message: String(message),
                    type: String(messageType),
                    timestamp: String(data.timestamp || Date.now()),
                    image: String(data.image || ''),
                    messageId: messageId
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'buzz_channel',
                        sound: 'buzz',
                        priority: 'high',
                        defaultSound: false,
                        defaultVibrateTimings: false,
                        vibrateTimingsMillis: messageType === 'VIBRATE' ? [0, 500, 250, 500] : [0, 250, 250, 250],
                        icon: 'ic_stat_bee',
                        color: '#ffbf00'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'buzz.wav',
                            badge: 1,
                            contentAvailable: true, // Wake app in background
                            category: 'BUZZ_CATEGORY'
                        }
                    }
                },
                token: fcmToken
            };

            // Send the notification
            const response = await admin.messaging().send(payload);
            console.log(`✅ Push notification sent to ${userId}:`, response);

            // Optionally increment badge count
            if (userData.badgeCount !== undefined) {
                await userDoc.ref.update({
                    badgeCount: admin.firestore.FieldValue.increment(1)
                });
            }

            return response;
        } catch (error) {
            console.error(`❌ Error sending push notification to ${userId}:`, error);
            return null;
        }
    });

/**
 * 🧹 Cleanup old inbox messages
 * Runs daily to remove old processed messages (optional)
 */
exports.cleanupOldInboxMessages = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
        const db = admin.firestore();
        const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            const inboxRef = db.collection('users').doc(userDoc.id).collection('inbox');
            const oldMessages = await inboxRef
                .where('timestamp', '<', new Date(cutoffTime).toISOString())
                .get();

            const batch = db.batch();
            oldMessages.docs.forEach(doc => batch.delete(doc.ref));

            if (oldMessages.size > 0) {
                await batch.commit();
                console.log(`Cleaned up ${oldMessages.size} old messages for user ${userDoc.id}`);
            }
        }

        return null;
    });

/**
 * 🔔 Reset badge count when user opens app
 */
exports.resetBadgeCount = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = data.userId || context.auth.uid;

    try {
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .update({ badgeCount: 0 });

        return { success: true };
    } catch (error) {
        console.error('Error resetting badge count:', error);
        throw new functions.https.HttpsError('internal', 'Failed to reset badge count');
    }
});

/**
 * 🔥 Daily Streak Cleanup
 * Runs every day at midnight to clean up expired streaks
 */
exports.cleanupExpiredStreaks = functions.pubsub
    .schedule('0 0 * * *') // Run at midnight every day
    .timeZone('UTC')
    .onRun(async (context) => {
        const db = admin.firestore();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];

        console.log(`🧹 Starting streak cleanup for ${todayString}`);

        try {
            const streaksSnapshot = await db.collection('streaks').get();
            let deletedCount = 0;
            let resetCount = 0;

            const batch = db.batch();
            let batchCount = 0;

            for (const docSnap of streaksSnapshot.docs) {
                const streak = docSnap.data();
                const lastBuzzDate = new Date(streak.lastBuzzDate);
                const daysSinceLastBuzz = Math.floor((today.getTime() - lastBuzzDate.getTime()) / (1000 * 60 * 60 * 24));

                // If more than 2 days without a buzz and no freeze available, reset or delete
                if (daysSinceLastBuzz > 2 || (daysSinceLastBuzz === 2 && streak.streakFreezeUsed)) {
                    // Delete the streak document if streak is broken beyond recovery (more than 7 days)
                    if (daysSinceLastBuzz > 7) {
                        batch.delete(docSnap.ref);
                        deletedCount++;
                    } else {
                        // Just reset the current streak but keep the record
                        batch.update(docSnap.ref, {
                            currentStreak: 0,
                            updatedAt: new Date().toISOString()
                        });
                        resetCount++;
                    }

                    batchCount++;

                    // Firestore batch limit is 500 operations
                    if (batchCount >= 500) {
                        await batch.commit();
                        batchCount = 0;
                    }
                }
            }

            // Commit any remaining operations
            if (batchCount > 0) {
                await batch.commit();
            }

            console.log(`✅ Streak cleanup complete: ${deletedCount} deleted, ${resetCount} reset`);
            return { success: true, deleted: deletedCount, reset: resetCount };
        } catch (error) {
            console.error('❌ Error during streak cleanup:', error);
            return { success: false, error: error.message };
        }
    });
