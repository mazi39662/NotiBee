# 🐝 Android Chat Heads Implementation Guide

## Overview

This implementation adds Messenger-style floating chat heads to NotiBee on Android. The chat heads display custom bee avatars and can float over other apps.

---

## ✅ What's Included

### Android Native Files
- **ChatHeadPlugin.java** - Capacitor plugin for chat head control
- **ChatHeadService.java** - Foreground service managing the floating window
- **chat_head_layout.xml** - UI layout for the chat head
- **badge_background.xml** - Unread count badge design

### TypeScript Files
- **ChatHeadPlugin.ts** - Plugin interface definition
- **ChatHeadService.ts** - Service wrapper with bee customization
- **web.ts** - Web fallback (no-op)

### Permissions Added
- `SYSTEM_ALERT_WINDOW` - Draw over other apps
- `FOREGROUND_SERVICE` - Keep service running
- `FOREGROUND_SERVICE_MEDIA_PROJECTION` - Service type

---

## 🚀 How to Use

### 1. Request Permission (First Time)

```typescript
import { useChatHeadService } from '@/services/ChatHeadService';

const chatHeadService = useChatHeadService();

// Check if supported (Android only)
if (chatHeadService.isSupported()) {
  // Request permission
  const granted = await chatHeadService.requestPermission();
  
  if (granted) {
    console.log('Chat head permission granted!');
  } else {
    console.log('User denied permission');
  }
}
```

### 2. Show Chat Head When Message Arrives

```typescript
// In your BuzzService or notification handler
import { useChatHeadService } from '@/services/ChatHeadService';

const chatHeadService = useChatHeadService();

// When a new message arrives
async function onMessageReceived(buzz: any) {
  const senderBee = await getUserProfile(buzz.sender);
  
  // Show chat head with custom bee avatar
  await chatHeadService.showChatHead(
    buzz.sender,                    // Bee ID
    buzz.message,                   // Message preview
    senderBee.customization,        // Bee customization { top, body, eyes }
    1                               // Unread count
  );
}
```

### 3. Update Chat Head (New Messages)

```typescript
// When more messages arrive from the same bee
await chatHeadService.updateChatHead(
  beeId,
  latestMessage,
  customization,
  unreadCount  // Increment this
);
```

### 4. Hide Chat Head

```typescript
// When user opens the conversation
await chatHeadService.hideChatHead();

// Or remove all chat heads
await chatHeadService.removeAllChatHeads();
```

---

## 🎨 Integration Example: Tab1Page.vue

Add this to your existing inbox listener:

```typescript
// In Tab1Page.vue or App.vue
import { useChatHeadService } from '@/services/ChatHeadService';

const chatHeadService = useChatHeadService();

// In your initInboxListener function
const initInboxListener = () => {
  if (!userBeeId.value) return;
  
  const inboxRef = collection(db, `users/${userBeeId.value}/inbox`);
  
  unsubscribeInbox = onSnapshot(inboxRef, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const buzz = change.doc.data();
        
        // Show local notification (existing code)
        await sendLocalBuzz(buzz);
        
        // NEW: Show chat head if app is in background
        if (document.hidden) {
          const senderProfile = beeStates.value.find(b => b.beeId === buzz.sender);
          
          if (senderProfile) {
            await chatHeadService.showChatHead(
              buzz.sender,
              buzz.message || '🎤 Voice message',
              senderProfile.customization,
              unreadCounts.value[buzz.sender] || 1
            );
          }
        }
        
        // Delete from inbox (existing code)
        await deleteDoc(change.doc.ref);
      }
    }
  });
};
```

---

## 🎯 Advanced: Custom Bee Avatar Rendering

Currently, the chat head shows a simplified bee (golden circle with stripes). To show the actual custom bee avatar:

### Option A: Send Customization JSON (Current)

The service sends the customization as JSON. You'll need to enhance `ChatHeadService.java` to render SVG parts.

### Option B: Render in JavaScript (Recommended)

Modify `generateBeeAvatarData()` in `ChatHeadService.ts`:

```typescript
private async generateBeeAvatarData(
  customization: { top: string; body: string; eyes: string; accessories?: string[] }
): Promise<string> {
  // Create a hidden canvas
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return JSON.stringify(customization);

  // Load bee parts as images
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  try {
    // Load all bee parts
    const body = await loadImage(`/assets/bee/${customization.body}.svg`);
    const top = await loadImage(`/assets/bee/${customization.top}.svg`);
    const eyes = await loadImage(`/assets/bee/${customization.eyes}.svg`);

    // Draw them in order
    ctx.drawImage(body, 0, 0, 200, 200);
    ctx.drawImage(top, 0, 0, 200, 200);
    ctx.drawImage(eyes, 0, 0, 200, 200);

    // Draw accessories if any
    if (customization.accessories) {
      for (const acc of customization.accessories) {
        const accImg = await loadImage(`/assets/bee/${acc}.svg`);
        ctx.drawImage(accImg, 0, 0, 200, 200);
      }
    }

    // Convert to base64
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering bee:', error);
    return JSON.stringify(customization);
  }
}
```

---

## 🔧 Customization Options

### Change Chat Head Size

Edit `chat_head_layout.xml`:

```xml
<androidx.cardview.widget.CardView
    android:layout_width="80dp"   <!-- Change this -->
    android:layout_height="80dp"  <!-- And this -->
    ...>
```

### Change Badge Color

Edit `badge_background.xml`:

```xml
<solid android:color="#FF4444" /> <!-- Change to any color -->
```

### Change Snap Behavior

In `ChatHeadService.java`, modify `snapToEdge()`:

```java
private void snapToEdge() {
    int screenWidth = getResources().getDisplayMetrics().widthPixels;
    
    // Snap to left only
    params.x = 0;
    
    // Or snap to right only
    // params.x = screenWidth - chatHeadView.getWidth();
    
    // Or don't snap at all (remove this method call)
    
    windowManager.updateViewLayout(chatHeadView, params);
}
```

---

## 🐛 Troubleshooting

### Chat Head Not Showing

1. **Check permission:**
   ```typescript
   const hasPermission = await chatHeadService.checkPermission();
   console.log('Has permission:', hasPermission);
   ```

2. **Check Android version:**
   - Requires Android 6.0+ (API 23+)
   - On Android 11+, user must manually enable in settings

3. **Check logs:**
   ```bash
   adb logcat | grep ChatHead
   ```

### Permission Request Not Working

On Android 11+, the system may restrict overlay permissions. Guide users:

```typescript
const granted = await chatHeadService.requestPermission();

if (!granted) {
  // Show instructions
  const alert = await alertController.create({
    header: 'Enable Chat Heads',
    message: 'Go to Settings > Apps > NotiBee > Display over other apps',
    buttons: ['OK']
  });
  await alert.present();
}
```

### Chat Head Opens Wrong Conversation

The chat head passes `beeId` to MainActivity. Make sure your router handles it:

```typescript
// In App.vue or router
import { useRoute } from 'vue-router';

const route = useRoute();

onMounted(() => {
  // Check if opened from chat head
  const openBee = route.query.openBee;
  if (openBee) {
    // Open conversation with this bee
    router.push(`/tabs/tab1?openBee=${openBee}`);
  }
});
```

---

## 📱 Testing

### Test on Real Device

1. Build the app:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

2. Run from Android Studio

3. Send yourself a test message

4. Put app in background

5. Chat head should appear!

### Test Permission Flow

```typescript
// Add a test button in your app
<ion-button @click="testChatHead">Test Chat Head</ion-button>

async function testChatHead() {
  const service = useChatHeadService();
  
  const granted = await service.requestPermission();
  
  if (granted) {
    await service.showChatHead(
      'TEST_BEE',
      'This is a test message!',
      { top: 'top-1', body: 'body-1', eyes: 'eye-1' },
      5
    );
  }
}
```

---

## 🎨 Future Enhancements

1. **Multiple Chat Heads** - Show multiple bees at once
2. **Animated Bees** - Flapping wings animation
3. **Quick Reply** - Tap to show reply input
4. **Swipe to Dismiss** - Swipe down to remove
5. **Minimize to Edge** - Collapse to small icon
6. **Custom Sounds** - Play buzz sound when showing

---

## 📚 Resources

- [Android Overlay Windows](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#TYPE_APPLICATION_OVERLAY)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Foreground Services](https://developer.android.com/guide/components/foreground-services)

---

## ✅ Checklist

- [x] Added SYSTEM_ALERT_WINDOW permission
- [x] Created ChatHeadPlugin.java
- [x] Created ChatHeadService.java
- [x] Created chat_head_layout.xml
- [x] Registered plugin in MainActivity
- [x] Added service to AndroidManifest
- [x] Created TypeScript wrapper
- [x] Added permission request flow
- [ ] Test on real Android device
- [ ] Implement custom bee avatar rendering
- [ ] Add to notification flow
- [ ] Test with multiple conversations

---

**You're all set!** 🐝 The chat head system is ready to use. Just integrate it into your message notification flow and test on a real Android device.
