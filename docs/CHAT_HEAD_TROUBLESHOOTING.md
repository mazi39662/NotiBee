# 🐝 Chat Head Troubleshooting Guide

## Quick Test

I've created a **test page** to help debug chat heads:

### Access the Test Page:
1. Navigate to: `/tabs/chat-head-test`
2. Or add a button in your app that routes to `chat-head-test`

The test page will show you:
- ✅ Platform support status
- ✅ Permission status
- ✅ Test buttons to show/hide/update chat heads
- ✅ Debug logs

---

## Common Issues & Fixes

### 1. Chat Head Not Appearing

**Possible Causes:**

#### A. Permission Not Granted
```
Solution: Request overlay permission
- The test page has a "Request Permission" button
- Or go to: Settings > Apps > NotiBee > Display over other apps
```

#### B. Service Not Starting
```
Check logcat for errors:
adb logcat | grep ChatHead

Look for:
- "showChatHead called"
- "Chat head view added"
- Any error messages
```

#### C. Layout Not Inflating
```
Make sure R.layout.chat_head_layout exists:
- Check: android/app/src/main/res/layout/chat_head_layout.xml
- Rebuild the project in Android Studio
```

### 2. Permission Request Not Working

**On Android 11+:**
- System may block automatic permission requests
- User must manually enable in Settings

**Solution:**
```kotlin
// Guide user to settings
Settings > Apps > NotiBee > Display over other apps > Enable
```

### 3. Chat Head Shows But Can't Drag

**Check WindowManager params:**
```java
// In ChatHeadService.java line 131
WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE  // ✅ Correct
```

### 4. App Crashes When Showing Chat Head

**Check Foreground Service:**
```xml
<!-- AndroidManifest.xml should have: -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
```

**Check Service Declaration:**
```xml
<service
    android:name=".ChatHeadService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="dataSync" />
```

---

## Testing Steps

### Step 1: Use the Test Page

1. **Build and run the app:**
   ```bash
   npx cap sync android
   npx cap open android
   ```

2. **Navigate to test page:**
   - In your browser/app, go to `/tabs/chat-head-test`

3. **Grant permission:**
   - Click "Request Permission"
   - Enable overlay permission

4. **Show chat head:**
   - Click "Show Chat Head"
   - **Look for a floating golden bee circle on your screen**

5. **Test interactions:**
   - Try dragging the bee around
   - Tap it to open the app
   - Click "Update" to change the badge count

### Step 2: Check Logcat

```bash
# Filter for chat head logs
adb logcat | grep -i "chathead\|overlay\|windowmanager"

# Look for these success messages:
- "Chat head shown successfully"
- "Permission granted"
- "View added to WindowManager"
```

### Step 3: Verify Permissions

```bash
# Check if overlay permission is granted
adb shell appops get com.cypherstudio.notibee SYSTEM_ALERT_WINDOW

# Should return: "allow"
```

---

## What Should Happen

When you click "Show Chat Head":

1. **Foreground notification appears** - "Chat head is active"
2. **Floating bee appears** - Golden circle with black stripes
3. **Badge shows count** - Red circle with number
4. **Can drag** - Move it around the screen
5. **Snaps to edge** - When you release it
6. **Tap opens app** - Returns to NotiBee

---

## Debug Checklist

- [ ] Platform is Android (not iOS/web)
- [ ] Overlay permission granted
- [ ] Foreground service started
- [ ] Layout file exists and is valid
- [ ] No errors in logcat
- [ ] WindowManager.addView() called successfully
- [ ] Chat head view is not null
- [ ] Screen is unlocked
- [ ] App is in background (for real usage)

---

## Manual Integration Test

If the test page works, but chat heads don't show in your app:

### Check Your Integration:

```typescript
// In Tab1Page.vue or wherever you handle messages
import { useChatHeadService } from '@/services/ChatHeadService';

const chatHeadService = useChatHeadService();

// When message arrives
if (document.hidden) {  // ⚠️ Important: Only show when app is hidden
  await chatHeadService.showChatHead(
    beeId,
    message,
    customization,
    unreadCount
  );
}
```

**Common mistake:** Trying to show chat head when app is visible
- Chat heads should only appear when app is in background
- Test by putting app in background, then sending a message

---

## Expected Behavior

### ✅ Correct:
1. App in background
2. Message arrives
3. Chat head appears floating over other apps
4. User can drag it around
5. Tapping opens NotiBee to that conversation

### ❌ Incorrect:
- Chat head appears when app is open (shouldn't happen)
- Chat head doesn't float (permission issue)
- Can't drag (wrong WindowManager flags)
- Crashes when showing (service/permission issue)

---

## Advanced Debugging

### Enable Verbose Logging:

Add to `ChatHeadService.java`:

```java
private static final String TAG = "ChatHeadService";

private void showChatHead() {
    Log.d(TAG, "showChatHead called");
    Log.d(TAG, "chatHeadView is null: " + (chatHeadView == null));
    
    // ... rest of code
    
    Log.d(TAG, "Adding view to WindowManager");
    windowManager.addView(chatHeadView, params);
    Log.d(TAG, "View added successfully");
}
```

### Check View Hierarchy:

```bash
# Dump view hierarchy
adb shell dumpsys window windows | grep -A 5 "NotiBee"

# Look for chat head window
```

---

## Still Not Working?

### Try These:

1. **Clean and rebuild:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew build
   ```

2. **Reinstall app:**
   ```bash
   adb uninstall com.cypherstudio.notibee
   # Then rebuild and install
   ```

3. **Check Android version:**
   - Android 6.0+ required
   - Android 11+ has stricter permissions

4. **Test on different device:**
   - Some manufacturers (Xiaomi, Huawei) have extra restrictions
   - Try on stock Android or Pixel device

---

## Success Indicators

You'll know it's working when:

✅ Test page shows "Permission granted"  
✅ Clicking "Show Chat Head" displays a floating bee  
✅ You can drag the bee around your screen  
✅ The bee stays visible even when switching apps  
✅ Tapping the bee opens NotiBee  
✅ Badge count updates correctly  

---

## Next Steps

Once the test page works:

1. ✅ Integrate into your message notification flow
2. ✅ Test with real messages
3. ✅ Customize the bee avatar rendering
4. ✅ Add to settings page for users to enable/disable

---

**Need more help?** Check the logcat output and share any error messages!
