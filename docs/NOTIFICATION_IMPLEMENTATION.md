# Real-Time & Background Push Notification Implementation Guide

## Overview
This document explains how NotiBee implements **real-time notifications** (when app is open) and **background push notifications** (when app is closed or in background).

## Architecture

### Two-Tier Notification System

#### 1. **Real-Time Notifications (Firestore Listener)**
- **When**: App is open/foreground
- **How**: Firestore `onSnapshot` listener on `users/{userId}/inbox` collection
- **Advantage**: Instant delivery, no server costs
- **Implementation**: `BuzzService.ts` → `initInboxListener()`

#### 2. **Background Push Notifications (FCM)**
- **When**: App is closed or in background
- **How**: Firebase Cloud Functions trigger FCM push notifications
- **Advantage**: Wakes up the app even when completely closed
- **Implementation**: `firebase_backend/functions/index.js` → `onInboxMessage()`

---

## How It Works

### Sending a Message Flow

```
User A sends buzz to User B
    ↓
Write to Firestore: users/UserB/inbox/{messageId}
    ↓
    ├─→ [App Open] Firestore listener catches it instantly
    │   └─→ Shows local notification
    │   └─→ Updates UI in real-time
    │
    └─→ [App Closed] Cloud Function triggers
        └─→ Sends FCM push notification
        └─→ Notification wakes up the app
        └─→ User taps → Opens chat with User A
```

### Receiving a Message Flow

#### When App is OPEN (Foreground)
1. Firestore listener in `App.vue` detects new inbox message
2. `initInboxListener()` callback fires
3. Shows local notification via `sendLocalBuzz()`
4. Adds to buzz history
5. Triggers haptic feedback
6. Deletes the inbox message (cleanup)

#### When App is CLOSED/BACKGROUND
1. Cloud Function `onInboxMessage` triggers
2. Fetches recipient's FCM token from Firestore
3. Sends FCM push notification
4. Device receives push → wakes up app
5. User taps notification → `pushNotificationActionPerformed` fires
6. App opens and navigates to chat with sender
7. Firestore listener processes the message and cleans up

---

## Key Components

### 1. `BuzzService.ts`
**Purpose**: Manages buzz messages and inbox listening

**Key Functions**:
- `initInboxListener(beeId, onMessage)` - Listens to Firestore inbox
- `sendBuzz(recipientId, message, senderId, recipientToken, image?)` - Sends a buzz
- `addReceivedBuzz()` - Saves received messages to local history
- `addSentBuzz()` - Saves sent messages to local history

**How it works**:
```typescript
// Start listening when user logs in
const unsubscribe = initInboxListener(userBeeId, (sender, msg, image, type) => {
    // Handle incoming message
    sendLocalBuzz(sender, msg, image);
    if (type === 'VIBRATE') {
        Haptics.vibrate({ duration: 500 });
    }
});
```

### 2. `PushService.ts`
**Purpose**: Manages FCM push notifications and local notifications

**Key Functions**:
- `initPush()` - Initializes push notification system
- `sendLocalBuzz()` - Shows local notification
- `clearAllNotifications()` - Clears all delivered notifications
- `getDeliveredNotificationsCount()` - Gets notification badge count

**Key Features**:
- Handles FCM token registration
- Listens for push notifications in foreground
- Handles notification taps (background/closed)
- Creates Android notification channel
- Tracks app foreground/background state

### 3. `firebase_backend/functions/index.js`
**Purpose**: Cloud Functions for background push notifications

**Key Functions**:
- `onInboxMessage` - Triggers when new inbox message is created
- `cleanupOldInboxMessages` - Daily cleanup of old messages
- `resetBadgeCount` - Resets notification badge

**How it works**:
```javascript
// Automatically triggers when: users/{userId}/inbox/{messageId} is created
exports.onInboxMessage = functions.firestore
    .document('users/{userId}/inbox/{messageId}')
    .onCreate(async (snap, context) => {
        // Get recipient's FCM token
        // Send push notification
        // Update badge count
    });
```

### 4. `App.vue`
**Purpose**: Global app initialization and inbox listener setup

**Key Responsibilities**:
- Initializes Firebase
- Starts push notification service
- Starts Firestore inbox listener when user logs in
- Manages online status heartbeat
- Handles app state changes (foreground/background)

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install @capacitor/push-notifications @capacitor/local-notifications
```

### 2. Configure Firebase Cloud Functions

#### Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

#### Deploy Cloud Functions
```bash
cd firebase_backend/functions
npm install
cd ../..
firebase deploy --only functions
```

### 3. Configure Android

#### Add to `android/app/src/main/AndroidManifest.xml`
```xml
<manifest>
    <application>
        <!-- Add this for background notifications -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="buzz_channel" />
        
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_stat_bee" />
        
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/notification_color" />
    </application>
</manifest>
```

#### Add to `android/app/src/main/res/values/colors.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="notification_color">#ffbf00</color>
</resources>
```

#### Add notification icon
Place `ic_stat_bee.png` in:
- `android/app/src/main/res/drawable-mdpi/`
- `android/app/src/main/res/drawable-hdpi/`
- `android/app/src/main/res/drawable-xhdpi/`
- `android/app/src/main/res/drawable-xxhdpi/`
- `android/app/src/main/res/drawable-xxxhdpi/`

### 4. Configure iOS

#### Add to `ios/App/App/Info.plist`
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>fetch</string>
</array>
```

#### Enable Push Notifications in Xcode
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select your app target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes" and check "Remote notifications"

### 5. Add Custom Notification Sound (Optional)

#### For Android
1. Add `buzz.wav` to `android/app/src/main/res/raw/`
2. File should be mono, 16-bit, 22kHz or 44.1kHz

#### For iOS
1. Add `buzz.wav` to `ios/App/App/Resources/`
2. File should be mono, 16-bit, 22kHz or 44.1kHz, max 30 seconds

---

## Testing

### Test Real-Time Notifications (App Open)
1. Open app on Device A
2. Send buzz from Device B to Device A
3. Device A should show notification immediately
4. Check console logs for: `📬 New buzz arrived!`

### Test Background Push Notifications (App Closed)
1. **Close** app completely on Device A (swipe away from recent apps)
2. Send buzz from Device B to Device A
3. Device A should receive push notification
4. Tap notification → app opens to chat with Device B
5. Check Firebase Functions logs: `✅ Push notification sent to {userId}`

### Check Firebase Functions Logs
```bash
firebase functions:log
```

### Debug Push Notifications
```bash
# Android
adb logcat | grep -i "fcm\|push\|notification"

# iOS
# Use Xcode Console
```

---

## Firestore Security Rules

Ensure your `firestore.rules` allows inbox writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can write to any other user's inbox
    match /users/{userId}/inbox/{messageId} {
      allow read, delete: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null; // Anyone can send messages
    }
    
    // Users can read their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Troubleshooting

### Notifications Not Received When App is Closed

**Check**:
1. FCM token is saved to Firestore: `users/{userId}/fcmToken` or `users/{userId}/pushToken`
2. Cloud Function is deployed: `firebase deploy --only functions`
3. Cloud Function logs show successful send: `firebase functions:log`
4. Device has internet connection
5. App has notification permissions enabled
6. Battery optimization is disabled for the app (Android)

### Notifications Received But Not Showing

**Check**:
1. Notification channel is created (Android)
2. Notification permissions granted
3. Do Not Disturb mode is off
4. Check notification settings in device settings

### Duplicate Notifications

**Cause**: Both Firestore listener AND Cloud Function sending notifications

**Solution**: The current implementation handles this by:
- Firestore listener only shows local notifications
- Cloud Function only sends when app is closed (FCM handles this automatically)

### FCM Token Not Saving

**Check**:
1. `PushNotifications.register()` is called
2. `registration` listener is set up before calling `register()`
3. User granted push notification permissions
4. Check console logs for: `✅ FCM TOKEN REGISTERED`

---

## Performance Considerations

### Battery Optimization
- Firestore listener only active when app is open
- Heartbeat runs every 45 seconds (not too frequent)
- Cloud Functions only trigger on new messages (event-driven)

### Data Usage
- Firestore listener uses minimal data (only new messages)
- Messages are deleted after processing (no accumulation)
- Cloud Functions run only when needed

### Cost Optimization
- Free tier: 125K function invocations/month
- Free tier: 10GB Firestore storage
- Free tier: Unlimited FCM messages
- Inbox messages are ephemeral (deleted after delivery)

---

## Advanced Features

### Badge Count Management
```typescript
// In your component
import { usePushService } from '@/services/PushService';

const { getDeliveredNotificationsCount, clearAllNotifications } = usePushService();

// Get count
const count = await getDeliveredNotificationsCount();

// Clear all
await clearAllNotifications();
```

### Custom Notification Actions
Add action buttons to notifications (Android):

```typescript
// In PushService.ts
await LocalNotifications.schedule({
    notifications: [{
        // ... other properties
        actionTypeId: 'BUZZ_ACTIONS',
        extra: { senderId: sender }
    }]
});

// Register action types
await LocalNotifications.registerActionTypes({
    types: [{
        id: 'BUZZ_ACTIONS',
        actions: [
            { id: 'reply', title: 'Reply' },
            { id: 'dismiss', title: 'Dismiss', destructive: true }
        ]
    }]
});
```

### Silent Push Notifications
For background data sync without showing notification:

```javascript
// In Cloud Function
const payload = {
    data: {
        type: 'SILENT_SYNC',
        data: JSON.stringify({ ... })
    },
    android: {
        priority: 'high'
    },
    apns: {
        payload: {
            aps: {
                contentAvailable: true,
                // No alert/sound = silent
            }
        }
    },
    token: fcmToken
};
```

---

## Summary

✅ **Real-time notifications** work via Firestore listeners when app is open
✅ **Background push notifications** work via Cloud Functions + FCM when app is closed
✅ **Seamless experience** - user always receives notifications regardless of app state
✅ **Cost-effective** - uses free Firebase tier efficiently
✅ **Battery-friendly** - optimized for minimal battery drain

The system is production-ready and scalable! 🐝
