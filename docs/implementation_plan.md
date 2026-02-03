# Implementation Plan - NotiBee

NotiBee is a push-notification centric messaging app where users "Buzz" each other.

## 1. Theme & Branding
- **Color Palette**: Amber (#FFBF00), Gold (#FFD700), Deep Black (#0A0A0A), and Glassmorphic cards.
- **Typography**: Modern sans-serif (Inter/Outfit).
- **Aesthetics**: High-end dark mode, smooth transitions, and bee-themed icons.

## 2. Navigation Structure (Tabs)
- **Tab 1: Hive** - Feed of recent notifications.
- **Tab 2: Send Buzz** - UI to select a recipient and send a quick buzz.
- **Tab 3: Settings** - User profile, unique NotiBee ID, and notification settings.

## 3. Core Features
- **User Identification**: Generate a unique short "Bee ID" for each user.
- **Push Notifications**: UI for sending notifications (using Capacitor Push Notifications / FCM conceptual integration).
- **Buzz Feedback**: Visual animation when a buzz is sent.

## 4. Components
- `BuzzCard`: Displaying individual notification history.
- `BeeAvatar`: Themed user avatars.
- `GlassContainer`: Reusable glassmorphic wrapper.

## 5. Implementation Steps
1. Update `variables.css` with the gold/black theme.
2. Refactor `TabsPage.vue` with themed icons and labels.
3. Design `Tab1Page.vue` (Hive) with activity feed.
4. Design `Tab2Page.vue` (Send Buzz) with a sleek search and "Buzz" button.
5. Design `Tab3Page.vue` (Settings) with profile info.
6. Add smooth animations using Framer Motion (or simple CSS transitions/Ionic animations).
