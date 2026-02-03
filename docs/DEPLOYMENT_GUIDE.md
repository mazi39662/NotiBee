# Quick Deployment Guide

## Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created and configured
- Blaze plan enabled (required for Cloud Functions)

## Step 1: Deploy Cloud Functions

```powershell
# Navigate to functions directory
cd firebase_backend\functions

# Install dependencies
npm install

# Go back to root
cd ..\..

# Login to Firebase (if not already)
firebase login

# Deploy functions
firebase deploy --only functions
```

## Step 2: Verify Deployment

```powershell
# Check function logs
firebase functions:log

# You should see:
# ✓ functions[onInboxMessage(us-central1)]
# ✓ functions[cleanupOldInboxMessages(us-central1)]
# ✓ functions[resetBadgeCount(us-central1)]
```

## Step 3: Update Firestore Rules

```powershell
# Deploy Firestore rules
firebase deploy --only firestore:rules
```

## Step 4: Build and Sync App

```powershell
# Build the app
npm run build

# Sync with Capacitor
npx cap sync

# For Android
npx cap open android

# For iOS
npx cap open ios
```

## Step 5: Test Notifications

### Test 1: Real-time (App Open)
1. Open app on Device A
2. Send buzz from Device B
3. Device A should show notification immediately

### Test 2: Background Push (App Closed)
1. Close app on Device A completely
2. Send buzz from Device B
3. Device A should receive push notification
4. Tap notification → opens to chat

## Troubleshooting

### Cloud Functions Not Deploying
```powershell
# Check Firebase project
firebase projects:list

# Use correct project
firebase use <project-id>

# Check billing (Blaze plan required)
# Go to: https://console.firebase.google.com/project/<project-id>/usage
```

### Notifications Not Working
```powershell
# Check function logs
firebase functions:log --limit 50

# Test function manually
# Go to Firebase Console → Functions → onInboxMessage → Test
```

### FCM Token Issues
- Ensure app has notification permissions
- Check `users/{userId}` document has `fcmToken` or `pushToken` field
- Verify token is not expired (tokens can expire)

## Monitoring

### View Function Logs
```powershell
firebase functions:log --limit 100
```

### View Firestore Data
```powershell
# Open Firebase Console
firebase open
# Navigate to Firestore Database
```

### Check Function Performance
- Go to Firebase Console → Functions
- View invocations, errors, and execution time

## Cost Estimation

### Free Tier (Spark Plan)
- ❌ Cloud Functions NOT available

### Blaze Plan (Pay-as-you-go)
- ✅ 2M function invocations/month FREE
- ✅ 400,000 GB-seconds compute time FREE
- ✅ 200,000 CPU-seconds compute time FREE
- ✅ Unlimited FCM messages FREE

**Estimated cost for 1000 active users:**
- ~30,000 notifications/day = ~900,000/month
- Well within free tier limits
- **Cost: $0/month** 🎉

## Next Steps

1. ✅ Deploy Cloud Functions
2. ✅ Test on real devices
3. ✅ Monitor function logs
4. ✅ Set up error alerting (optional)
5. ✅ Configure custom notification sounds
6. ✅ Add notification icons for Android

## Support

For issues, check:
- `NOTIFICATION_IMPLEMENTATION.md` - Full documentation
- Firebase Console Logs
- Device logs (adb logcat for Android)
