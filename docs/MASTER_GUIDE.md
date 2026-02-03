# NotiBee Project Master Guide 🐝

This document serves as the primary reference for the architectural design, implementation patterns, and visual standards of the NotiBee v2 project. Use this as a guide for all future implementations to ensure consistency and correctness.

---

## 🎨 Theme & Aesthetic Standards

### 1. Visual Identity
- **Primary Color**: Amber/Gold (#ffbf00).
- **Secondary Color**: Slate/Dark Grays for backgrounds.
- **Default Mode**: **Dark Mode** is the primary experience. New users default to dark mode.
- **Design System**: 
  - **Glassmorphism**: Use semi-transparent backgrounds with backdrop-blur for modals and floating elements.
  - **Micro-animations**: Use smooth transitions for bee interactions, wing flapping, and page navigations.
  - **Typography**: Modern sans-serif (Inter/Outfit).

### 2. Implementation Rules
- Always use the CSS variables defined in `src/theme/variables.css`.
- Avoid hardcoding hex codes in components; use Tailwind utility classes or theme variables.
- The **Bee ID** is the core identifier for users (e.g., `user#1234`). Avoid using Firebase UIDs in the UI.

---

## 💬 Messaging Architecture (The "Buzz" System)

Messaging in NotiBee is designed to be fast, ephemeral, and decentralized.

### 1. Real-Time Communication (Inbox)
- **Path**: `users/{beeId}/inbox/{messageId}`
- **How it works**: 
  - When User A sends a message to User B, it is written to User B's `inbox` subcollection.
  - The app listens to this collection in real-time.
  - **Crucial**: As soon as a message is processed (shown in a bubble or notification), it is **immediately deleted** from Firestore. This keeps the database lean and provides privacy.
- **State**: The "Last 50 messages" are stored locally in the device's `localStorage` via `BuzzService`.

### 2. Distributed Room Storage (Hive Hub)
- **Concept**: There is no global `rooms` collection. Every member of a room has their own copy of the room document.
- **Paths**: `users/{beeId}/rooms/{roomId}`
- **Why**: This prevents unauthorized access to room list and scales horizontally.
- **Workflow**:
  - **Creation**: When a room is created, the creator uses a `writeBatch` to write the room document to every initial member's `rooms` subcollection.
  - **Updates**: Any change (name change, member added) must be replicated across all member copies using `updateRoomCopies`.
  - **Messages**: Room messages ("Buzzes") are typically stored under the room owner's document: `users/{ownerId}/rooms/{roomId}/buzzes`.

---

## 🔔 Notification System

NotiBee uses a dual-layer notification system to ensure messages arrive whether the app is open or closed.

### 1. Foreground Notifications (Real-time)
- Handled by the `initInboxListener` in `App.vue`.
- Triggers `sendLocalBuzz` in `PushService` to show a heads-up notification while the app is active.
- Uses `Haptics` (vibration) to alert the user.

### 2. Background/Push Notifications (FCM)
- **The Dispatch Queue**:
  - Instead of calling FCM directly from the app, the app writes to a top-level `dispatch` collection in Firestore.
  - **Schema**: `{ to: "FCM_TOKEN", title: "...", body: "...", data: { ... } }`
- **Cloud Functions**:
  - A Firestore Trigger (`onDocumentCreated`) monitors the `dispatch` collection.
  - The function sends the notification via Firebase Cloud Messaging (FCM).
  - **Cleanup**: The function **must** delete the document from `dispatch` after attempting the send (successful or not) to keep the queue clean.

### 3. Local Notifications
- Used to handle clicks from both FCM and foreground messages.
- Scheduled via Capacitor `LocalNotifications`.

---

## 🏗️ Future Implementations: Rules of Thumb

When adding new features, follow these guidelines:

1.  **Storage**: If a feature involves shared state (like a game or shared list), consider the "Distributed" approach (replicated copies) instead of a single global document.
2.  **Ephemerality**: Keep Firestore documents short-lived. If it's a notification or a real-time event, delete it after consumption.
3.  **Bee Assets**: Maintain the asset structure in `public/assets/bee/`. New accessories (hats, eyes) should follow the naming convention: `eye-type.svg`, `acc-type.svg`.
4.  **Offline Support**: Use the `outbox` pattern in `BuzzService`. If a message fails due to network, save it to `localStorage` and retry when `isOnline` becomes true.
5.  **Honey Drops (Currency)**: Users earn "Honey Drops" for viewing stories, sending buzzes, and maintaining streaks. Always integrate `HoneyService` when adding new interaction points.

---

## 🛠️ Service Reference

- `UserService`: User profiles, FCM tokens, Bee ID mapping, Presence (online status).
- `BuzzService`: Inbox listening, sending messages, local history.
- `RoomService`: Shared room management and distributed updates.
- `PushService`: Notification registration and local scheduling.
- `HoneyService`: XP/Currency system for rewards.
- `StrokeService`: Manages daily streaks and activity tracking.
