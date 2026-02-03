const { firestore } = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onDispatchBuzz = firestore
    .document("dispatch/{id}")
    .onCreate(async (snap, context) => {
        const data = snap.data();
        if (!data) return null;

        console.log(`🐝 Processing dispatch for: ${data.to}`);

        const message = {
            token: data.to,
            notification: {
                title: data.title || "🐝 New Buzz!",
                body: data.body || "A bee is buzzing you.",
            },
            data: {
                senderId: String(data.data?.senderId || "Unknown"),
                type: String(data.data?.type || "BUZZ"),
                message: String(data.data?.message || ""),
                image: String(data.data?.image || "")
            },
            android: {
                priority: "high",
                notification: {
                    sound: "buzz",
                    channelId: "buzz_channel",
                    icon: "ic_stat_bee",
                    color: "#ffbf00"
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: "buzz.caf",
                        badge: 1
                    }
                }
            }
        };

        try {
            await admin.messaging().send(message);
            console.log("✅ FCM Push Sent Successfully");
        } catch (error) {
            console.error("❌ FCM Error:", error);
        } finally {
            // ALWAYS delete the document to keep Firestore clean
            return snap.ref.delete();
        }
    });
