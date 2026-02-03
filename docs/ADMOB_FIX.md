# 🔧 AdMob Crash Fix

## Problem
The app was crashing on startup with this error:
```
java.lang.IllegalStateException: Missing application ID
AdMob publishers should follow the instructions to add a valid App ID inside the AndroidManifest.
```

## Solution
Added the required AdMob Application ID to `AndroidManifest.xml`:

```xml
<!-- AdMob Application ID (Required) -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713" />
```

## Current Status
✅ **Using Google's Test AdMob ID** - This is a placeholder that allows the app to run without crashing.

## ⚠️ Important: Before Publishing

When you're ready to monetize with AdMob, you MUST:

1. **Create an AdMob Account**
   - Go to https://apps.admob.com
   - Sign in with your Google account
   - Create a new app

2. **Get Your Real App ID**
   - In AdMob console, go to Apps
   - Click on your app
   - Copy your Application ID (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

3. **Replace the Test ID**
   - Open `android/app/src/main/AndroidManifest.xml`
   - Find the AdMob meta-data section
   - Replace the test ID with your real ID:
   ```xml
   <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-YOUR_REAL_ID_HERE~YOUR_APP_ID" />
   ```

4. **Sync and Rebuild**
   ```bash
   npx cap sync android
   ```

## Test Ad Unit IDs

If you're testing ads during development, use these Google test ad unit IDs:

- **Banner**: `ca-app-pub-3940256099942544/6300978111`
- **Interstitial**: `ca-app-pub-3940256099942544/1033173712`
- **Rewarded**: `ca-app-pub-3940256099942544/5224354917`
- **Native Advanced**: `ca-app-pub-3940256099942544/2247696110`

## Alternative: Disable AdMob

If you don't want to use AdMob at all, you can remove it:

1. **Uninstall the package:**
   ```bash
   npm uninstall @capacitor-community/admob
   ```

2. **Remove AdService imports** from your code

3. **Sync:**
   ```bash
   npx cap sync android
   ```

---

**Current Configuration:** Using test ID - App will run without crashes ✅
