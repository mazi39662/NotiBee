# NotiBee Notification System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION SYSTEM                          │
│                                                                       │
│  ┌──────────────┐                              ┌──────────────┐     │
│  │   Device A   │                              │   Device B   │     │
│  │  (Sender)    │                              │  (Receiver)  │     │
│  └──────┬───────┘                              └──────▲───────┘     │
│         │                                             │              │
│         │ 1. Send Buzz                                │              │
│         ▼                                             │              │
│  ┌──────────────────────────────────────────────┐    │              │
│  │         Firestore Database                   │    │              │
│  │  ┌────────────────────────────────────────┐  │    │              │
│  │  │  users/UserB/inbox/{messageId}         │  │    │              │
│  │  │  {                                      │  │    │              │
│  │  │    from: "UserA",                       │  │    │              │
│  │  │    message: "Hello!",                   │  │    │              │
│  │  │    type: "BUZZ",                        │  │    │              │
│  │  │    timestamp: "2026-01-21T16:00:00Z"    │  │    │              │
│  │  │  }                                      │  │    │              │
│  │  └────────────────────────────────────────┘  │    │              │
│  └──────────────┬───────────────────────────────┘    │              │
│                 │                                     │              │
│                 │ 2. Triggers                         │              │
│                 ▼                                     │              │
│  ┌──────────────────────────────────────────────┐    │              │
│  │     TWO PARALLEL PATHS                       │    │              │
│  │                                               │    │              │
│  │  PATH A: App Open (Real-time)                │    │              │
│  │  ┌────────────────────────────────────────┐  │    │              │
│  │  │  Firestore Listener (App.vue)          │  │    │              │
│  │  │  - Detects new message instantly       │  │    │              │
│  │  │  - Shows local notification            │  │    │ 3a. Local   │
│  │  │  - Triggers haptic feedback            │  │────┼──Notification│
│  │  │  - Deletes message after processing    │  │    │              │
│  │  └────────────────────────────────────────┘  │    │              │
│  │                                               │    │              │
│  │  PATH B: App Closed (Background Push)        │    │              │
│  │  ┌────────────────────────────────────────┐  │    │              │
│  │  │  Cloud Function (onInboxMessage)       │  │    │              │
│  │  │  1. Fetches UserB's FCM token          │  │    │              │
│  │  │  2. Sends FCM push notification        │  │────┼──3b. FCM    │
│  │  │  3. Updates badge count                │  │    │   Push      │
│  │  └────────────────────────────────────────┘  │    │              │
│  └──────────────────────────────────────────────┘    │              │
│                                                       │              │
│                                                       ▼              │
│                                            ┌──────────────────────┐  │
│                                            │  Device B Receives   │  │
│                                            │  - Shows notification│  │
│                                            │  - Plays sound       │  │
│                                            │  - Vibrates          │  │
│                                            └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Message Flow Diagram

```
SENDER (Device A)                    FIRESTORE                    RECEIVER (Device B)
─────────────────                    ─────────                    ───────────────────

     │                                   │                                │
     │ sendBuzz()                        │                                │
     ├──────────────────────────────────▶│                                │
     │                                   │                                │
     │                                   │ onCreate trigger               │
     │                                   ├───────────────┐                │
     │                                   │               │                │
     │                                   │        ┌──────▼──────┐         │
     │                                   │        │   Cloud     │         │
     │                                   │        │  Function   │         │
     │                                   │        └──────┬──────┘         │
     │                                   │               │                │
     │                                   │               │ FCM Send       │
     │                                   │               └───────────────▶│
     │                                   │                                │
     │                                   │ onSnapshot (if app open)       │
     │                                   ├───────────────────────────────▶│
     │                                   │                                │
     │                                   │                    ┌───────────┤
     │                                   │                    │ Process   │
     │                                   │                    │ Message   │
     │                                   │                    └───────────┤
     │                                   │                                │
     │                                   │◀────── Delete message ─────────┤
     │                                   │                                │
     ▼                                   ▼                                ▼
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.vue                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  onMounted()                                                    │ │
│  │  - initFirebase()                                               │ │
│  │  - initPush()  ────────────────────┐                            │ │
│  │  - initTheme()                     │                            │ │
│  │                                    │                            │ │
│  │  watch([userBeeId, currentUser])  │                            │ │
│  │  - initInboxListener() ────────┐  │                            │ │
│  └────────────────────────────────┼──┼────────────────────────────┘ │
└────────────────────────────────────┼──┼──────────────────────────────┘
                                     │  │
                    ┌────────────────┘  └────────────────┐
                    │                                     │
                    ▼                                     ▼
         ┌──────────────────────┐           ┌──────────────────────┐
         │   BuzzService.ts     │           │   PushService.ts     │
         ├──────────────────────┤           ├──────────────────────┤
         │ initInboxListener()  │           │ initPush()           │
         │ - onSnapshot()       │           │ - register FCM       │
         │ - Process messages   │           │ - Setup listeners    │
         │ - Delete after read  │           │ - Handle taps        │
         │                      │           │ - Show local notifs  │
         │ sendBuzz()           │           │                      │
         │ - Write to inbox     │           │ sendLocalBuzz()      │
         │ - Add to history     │           │ - Schedule notif     │
         └──────────────────────┘           └──────────────────────┘
                    │                                     │
                    │                                     │
                    ▼                                     ▼
         ┌──────────────────────────────────────────────────────────┐
         │                    Firestore Database                     │
         │  ┌─────────────────────────────────────────────────────┐ │
         │  │ users/{userId}                                      │ │
         │  │ - beeId: string                                     │ │
         │  │ - fcmToken: string  ◀─── Saved by PushService       │ │
         │  │ - online: boolean                                   │ │
         │  │ - lastSeen: timestamp                               │ │
         │  │                                                     │ │
         │  │ inbox/{messageId}  ◀──── Written by sendBuzz()      │ │
         │  │ - from: string                                      │ │
         │  │ - message: string                                   │ │
         │  │ - type: string                                      │ │
         │  │ - timestamp: string                                 │ │
         │  └─────────────────────────────────────────────────────┘ │
         └──────────────────────────────────────────────────────────┘
                                     │
                                     │ onCreate trigger
                                     ▼
         ┌──────────────────────────────────────────────────────────┐
         │           Firebase Cloud Functions                        │
         │  ┌─────────────────────────────────────────────────────┐ │
         │  │ onInboxMessage                                      │ │
         │  │ 1. Get recipient user document                      │ │
         │  │ 2. Extract FCM token                                │ │
         │  │ 3. Build notification payload                       │ │
         │  │ 4. Send via admin.messaging().send()                │ │
         │  │ 5. Update badge count                               │ │
         │  └─────────────────────────────────────────────────────┘ │
         └──────────────────────────────────────────────────────────┘
                                     │
                                     │ FCM Push
                                     ▼
         ┌──────────────────────────────────────────────────────────┐
         │              Recipient Device (Background)                │
         │  ┌─────────────────────────────────────────────────────┐ │
         │  │ FCM Service (System)                                │ │
         │  │ - Receives push notification                        │ │
         │  │ - Wakes up app (if needed)                          │ │
         │  │ - Shows notification                                │ │
         │  │                                                     │ │
         │  │ User taps notification                              │ │
         │  │ - Triggers pushNotificationActionPerformed          │ │
         │  │ - Opens app to /tabs/tab1?openBee={sender}          │ │
         │  └─────────────────────────────────────────────────────┘ │
         └──────────────────────────────────────────────────────────┘
```

## State Machine: Notification Delivery

```
                    ┌─────────────────┐
                    │  Message Sent   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Written to       │
                    │ Firestore Inbox  │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌───────────────────┐     ┌───────────────────┐
    │   App is OPEN     │     │  App is CLOSED    │
    │   (Foreground)    │     │  (Background)     │
    └─────────┬─────────┘     └─────────┬─────────┘
              │                         │
              ▼                         ▼
    ┌───────────────────┐     ┌───────────────────┐
    │ Firestore         │     │ Cloud Function    │
    │ Listener          │     │ Triggers          │
    │ Detects Change    │     │                   │
    └─────────┬─────────┘     └─────────┬─────────┘
              │                         │
              ▼                         ▼
    ┌───────────────────┐     ┌───────────────────┐
    │ Show Local        │     │ Send FCM Push     │
    │ Notification      │     │ Notification      │
    └─────────┬─────────┘     └─────────┬─────────┘
              │                         │
              ▼                         ▼
    ┌───────────────────┐     ┌───────────────────┐
    │ User Sees         │     │ Device Receives   │
    │ Notification      │     │ Push              │
    │ Immediately       │     └─────────┬─────────┘
    └─────────┬─────────┘               │
              │                         ▼
              │               ┌───────────────────┐
              │               │ User Taps         │
              │               │ Notification      │
              │               └─────────┬─────────┘
              │                         │
              └────────────┬────────────┘
                           │
                           ▼
                ┌───────────────────┐
                │ Open Chat with    │
                │ Sender            │
                └───────────────────┘
```

## Data Flow: FCM Token Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    FCM Token Lifecycle                          │
└─────────────────────────────────────────────────────────────────┘

1. App Launch
   │
   ├─▶ initPush() called
   │   │
   │   ├─▶ Request permissions
   │   │
   │   ├─▶ PushNotifications.register()
   │   │
   │   └─▶ Wait for 'registration' event
   │
   ▼
2. Token Received
   │
   ├─▶ 'registration' listener fires
   │   │
   │   ├─▶ deviceToken.value = token.value
   │   │
   │   └─▶ saveUserProfile(userBeeId, token)
   │
   ▼
3. Token Saved to Firestore
   │
   └─▶ users/{userId}/fcmToken = token
   
4. Token Used for Push
   │
   ├─▶ Cloud Function reads fcmToken
   │
   └─▶ Sends push notification to that token

5. Token Refresh (Automatic)
   │
   ├─▶ FCM automatically refreshes tokens periodically
   │
   ├─▶ 'registration' event fires again
   │
   └─▶ New token saved to Firestore
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Layers                              │
└─────────────────────────────────────────────────────────────────┘

1. Authentication
   ├─▶ Firebase Auth required for all operations
   └─▶ request.auth != null in Firestore rules

2. Firestore Rules
   ├─▶ Users can only read their own inbox
   ├─▶ Anyone can write to any inbox (for messaging)
   └─▶ Users can only update their own profile

3. Cloud Function Security
   ├─▶ Runs with admin privileges
   ├─▶ Only triggered by Firestore events
   └─▶ Cannot be called directly by clients

4. FCM Token Security
   ├─▶ Tokens stored in Firestore (protected by rules)
   ├─▶ Only Cloud Functions can read other users' tokens
   └─▶ Tokens expire automatically (FCM handles this)

5. Message Cleanup
   ├─▶ Messages deleted after processing
   ├─▶ No permanent message storage
   └─▶ Privacy-first design
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Optimization Strategies                      │
└─────────────────────────────────────────────────────────────────┘

1. Firestore Listener
   ├─▶ Only active when app is open
   ├─▶ Automatically unsubscribes when app closes
   └─▶ Minimal data transfer (only new messages)

2. Cloud Functions
   ├─▶ Event-driven (only runs when needed)
   ├─▶ Cold start optimization (minimal dependencies)
   └─▶ Automatic scaling

3. Message Cleanup
   ├─▶ Immediate deletion after processing
   ├─▶ Daily cleanup of old messages (scheduled function)
   └─▶ Prevents database bloat

4. Battery Optimization
   ├─▶ Heartbeat every 45 seconds (not too frequent)
   ├─▶ FCM handles push delivery (no app polling)
   └─▶ Firestore listener uses WebSocket (efficient)

5. Network Optimization
   ├─▶ Minimal payload size
   ├─▶ Compressed data transfer
   └─▶ Offline support (Firestore cache)
```
