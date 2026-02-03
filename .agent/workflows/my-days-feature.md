---
description: My Days Feature - Instagram Stories Clone
---

# My Days Feature

A complete Instagram Stories-like feature for NotiBee with 24-hour auto-deletion and heart button functionality.

## What Was Created

### 1. **MyDaysService.ts** (`src/services/MyDaysService.ts`)
Service layer handling all story operations:
- **Story Creation**: Take photos or upload from gallery
- **Auto-Deletion**: Stories automatically expire after 24 hours
- **Like System**: Users can like/unlike stories with heart button
- **View Tracking**: Track who has viewed each story
- **Real-time Updates**: Fetch and sync stories from Firestore

### 2. **MyDaysPage.vue** (`src/views/MyDaysPage.vue`)
Main stories page with premium UI:
- **My Stories Grid**: View your own stories with stats (likes, views, time remaining)
- **Colony Stories**: See stories from friends with unread indicators
- **Story Viewer Modal**: Full-screen story viewer with:
  - Progress bars for multiple stories
  - Heart button to like (with animation)
  - Swipe/tap navigation
  - Auto-advance through stories
  - Time stamps and user info
- **Create Options**: Take photo or choose from gallery

### 3. **Router Integration** (`src/router/index.ts`)
Added route: `/tabs/my-days`

### 4. **Navigation Button** (`src/views/Tab3Page.vue`)
Added "My Days" button in profile section for easy access

## Features

### ✨ Core Functionality
- **24-Hour Auto-Deletion**: Stories automatically expire and are deleted after 24 hours
- **Photo Capture**: Take photos directly with camera
- **Gallery Upload**: Choose existing photos from gallery
- **Like System**: Heart button to like stories (with animation)
- **View Tracking**: See who viewed your stories
- **Real-time Updates**: Stories sync across all users

### 🎨 Premium Design
- **Glassmorphism Effects**: Modern glass-style UI elements
- **Gradient Rings**: Unread stories have animated gradient rings
- **Smooth Animations**: Heart pop animation, progress bars, transitions
- **Dark Theme**: Beautiful dark mode optimized design
- **Responsive Layout**: Works on all screen sizes

### 📱 User Experience
- **Progress Indicators**: Visual progress bars for story sequences
- **Tap Navigation**: Tap left/right to navigate between stories
- **Auto-Advance**: Stories automatically advance after viewing
- **Time Remaining**: Shows how long until story expires
- **Delete Option**: Users can manually delete their own stories

## Data Structure

Stories are stored in Firestore with this structure:

```typescript
interface Story {
  id: string;              // Firestore document ID
  beeId: string;           // Creator's Bee ID
  imageUrl: string;        // Base64 data URL of image
  caption?: string;        // Optional caption
  createdAt: number;       // Timestamp (milliseconds)
  expiresAt: number;       // Expiration timestamp (createdAt + 24h)
  likes: string[];         // Array of Bee IDs who liked
  views: string[];         // Array of Bee IDs who viewed
}
```

## How to Use

### Creating a Story
1. Navigate to Settings (Tab 3)
2. Click "My Days" button
3. Click the "+" button in top right
4. Choose "Take Photo" or "Choose from Gallery"
5. Capture/select your photo
6. Story is automatically posted

### Viewing Stories
1. Open My Days page
2. Your stories appear in "My Stories" section
3. Friends' stories appear in "Colony Stories" section
4. Tap any story to view in full-screen
5. Tap left/right to navigate between stories
6. Tap heart button to like

### Managing Stories
- **View Stats**: See likes and views count on your stories
- **Delete**: Tap trash icon on your story to delete manually
- **Auto-Delete**: Stories automatically delete after 24 hours

## Technical Details

### Auto-Deletion System
- Stories have an `expiresAt` timestamp (24 hours from creation)
- Cleanup runs automatically every 60 seconds
- Expired stories are removed from Firestore
- Queries filter out expired stories

### Image Storage
- Images stored as Base64 data URLs in Firestore
- Compressed to 1080x1920 resolution
- Quality set to 80% for optimal balance

### Performance
- Real-time Firestore queries with proper indexing
- Efficient cleanup of expired content
- Optimized image loading and caching

## Future Enhancements

Potential improvements:
- [ ] Add text/sticker overlays
- [ ] Video story support
- [ ] Story replies/reactions
- [ ] Story highlights (save beyond 24h)
- [ ] Privacy controls (who can view)
- [ ] Story analytics dashboard
- [ ] Swipe gestures for navigation
- [ ] Music/audio support

## Notes

- Firestore rules already allow authenticated read/write
- Camera permissions required for photo capture
- Works on both web and mobile (Capacitor)
- Stories are public to all friends by default
