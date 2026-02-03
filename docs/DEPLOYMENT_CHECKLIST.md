# 🚀 Deployment Checklist - Buzz Streaks & Gamification

## Pre-Deployment Verification

### ✅ Code Files Created/Modified

#### New Files Created (4)
- [x] `src/services/StreakService.ts` - Streak management service
- [x] `src/views/AchievementsPage.vue` - Achievements display page
- [x] `src/views/LeaderboardPage.vue` - Leaderboard display page
- [x] `STREAKS_IMPLEMENTATION.md` - Implementation documentation
- [x] `STREAKS_GUIDE.md` - User guide

#### Files Modified (3)
- [x] `src/views/Tab1Page.vue` - Added streak badges and leaderboard button
- [x] `src/views/Tab3Page.vue` - Added gamification buttons
- [x] `src/router/index.ts` - Added new routes
- [x] `firebase_backend/functions/index.js` - Added streak cleanup function
- [x] `firestore.rules` - Added streaks collection rules

---

## 🔧 Firebase Configuration

### Firestore Indexes Required

Run these commands or create via Firebase Console:

```bash
# Index for streaks by userId and currentStreak (for leaderboard)
firebase firestore:indexes:create

# Or manually create in Firebase Console:
# Collection: streaks
# Fields: userId (Ascending), currentStreak (Descending)
```

### Deploy Firestore Rules

```bash
cd c:\Users\VICTUS\Documents\2026-Project\NotiBee_v2
firebase deploy --only firestore:rules
```

### Deploy Cloud Functions

```bash
cd c:\Users\VICTUS\Documents\2026-Project\NotiBee_v2\firebase_backend\functions
npm install
cd ../..
firebase deploy --only functions
```

**Functions to Deploy:**
- ✅ `onInboxMessage` (existing)
- ✅ `cleanupOldInboxMessages` (existing)
- ✅ `resetBadgeCount` (existing)
- ✅ `cleanupExpiredStreaks` (NEW - runs daily at midnight UTC)

---

## 📦 NPM Dependencies

All required dependencies should already be installed. Verify:

```bash
cd c:\Users\VICTUS\Documents\2026-Project\NotiBee_v2
npm list firebase
npm list @ionic/vue
npm list ionicons
```

No new dependencies were added for this feature.

---

## 🧪 Testing Checklist

### Local Testing (Before Deployment)

#### 1. Streak Functionality
- [ ] Send a buzz to a friend
- [ ] Verify streak counter appears on their bee avatar
- [ ] Check Firestore console for streak document creation
- [ ] Send another buzz next day (or change system date for testing)
- [ ] Verify streak increments to 2
- [ ] Wait 2 days without buzzing
- [ ] Verify streak resets to 0

#### 2. Achievements
- [ ] Navigate to Achievements page from Tab3
- [ ] Verify all achievements display correctly
- [ ] Send first buzz → Check "First Buzz" unlocks
- [ ] Filter achievements by category
- [ ] Verify locked achievements show in grayscale
- [ ] Verify unlocked achievements show checkmark

#### 3. Leaderboard
- [ ] Navigate to Leaderboard from Tab1 header
- [ ] Navigate to Leaderboard from Tab3
- [ ] Verify top 3 podium displays
- [ ] Verify your rank card shows
- [ ] Send more buzzes
- [ ] Verify rank updates in real-time

#### 4. UI/UX
- [ ] Streak badge animation works smoothly
- [ ] Leaderboard button in Tab1 header is clickable
- [ ] Gamification buttons in Tab3 are styled correctly
- [ ] All icons display properly (no missing icons)
- [ ] Pages are responsive on mobile
- [ ] Dark mode compatibility

#### 5. Performance
- [ ] Pages load quickly
- [ ] No console errors
- [ ] Firestore listeners clean up on unmount
- [ ] No memory leaks

---

## 🔍 Post-Deployment Verification

### After Deploying to Production

#### 1. Cloud Functions
- [ ] Check Firebase Console → Functions
- [ ] Verify `cleanupExpiredStreaks` is deployed
- [ ] Check function logs for any errors
- [ ] Verify scheduled function runs at midnight UTC

#### 2. Firestore Rules
- [ ] Test read access to streaks collection
- [ ] Test write access to streaks collection
- [ ] Verify unauthorized users cannot access

#### 3. User Testing
- [ ] Create test accounts
- [ ] Send buzzes between test accounts
- [ ] Verify streaks work across devices
- [ ] Test on iOS (if applicable)
- [ ] Test on Android (if applicable)
- [ ] Test on web browser

---

## 🐛 Common Issues & Solutions

### Issue: Streak badge not showing
**Solution:** 
- Check if `getUserStreaks` is being called in `onMounted`
- Verify Firestore listener is active
- Check browser console for errors

### Issue: Achievements not unlocking
**Solution:**
- Verify `updateStreak` is called after sending buzz
- Check `checkAchievements` function logic
- Verify user document has `achievements` field

### Issue: Leaderboard empty
**Solution:**
- Ensure users have sent buzzes (totalBuzzes > 0)
- Check Firestore query permissions
- Verify leaderboard listener is active

### Issue: Cloud Function not running
**Solution:**
- Check Firebase Console → Functions → Logs
- Verify function is deployed: `firebase functions:list`
- Check scheduler configuration

### Issue: TypeScript errors
**Solution:**
- Run `npm run build` to check for compilation errors
- Verify all imports are correct
- Check for missing type definitions

---

## 📊 Monitoring & Analytics

### Metrics to Track

1. **Engagement Metrics**
   - Average streak length
   - Number of active streaks
   - Achievement unlock rate
   - Leaderboard views

2. **Performance Metrics**
   - Page load times
   - Firestore read/write counts
   - Cloud Function execution time
   - Error rates

3. **User Behavior**
   - Daily active users
   - Buzz frequency
   - Streak retention rate
   - Achievement completion rate

### Firebase Console Checks

- **Firestore Usage**: Monitor read/write operations
- **Function Logs**: Check for errors in `cleanupExpiredStreaks`
- **Performance**: Monitor page load times
- **Crashlytics**: Check for app crashes (if enabled)

---

## 🔄 Rollback Plan

If issues occur after deployment:

### 1. Disable Cloud Function
```bash
firebase functions:delete cleanupExpiredStreaks
```

### 2. Revert Firestore Rules
```bash
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

### 3. Hide UI Elements
Comment out gamification buttons in Tab3Page.vue:
```vue
<!-- Temporarily disabled
<div class="gamification-section">
  ...
</div>
-->
```

### 4. Disable Streak Tracking
Comment out streak update in Tab1Page.vue:
```typescript
// Temporarily disabled
// if (userBeeId.value && targetId !== userBeeId.value) {
//     await updateStreak(userBeeId.value, targetId);
// }
```

---

## 📝 Final Deployment Steps

### Step 1: Build the App
```bash
cd c:\Users\VICTUS\Documents\2026-Project\NotiBee_v2
npm run build
```

### Step 2: Deploy Firebase Backend
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions
```

### Step 3: Deploy Web App (if applicable)
```bash
firebase deploy --only hosting
```

### Step 4: Build Mobile Apps (if applicable)
```bash
# iOS
npx cap sync ios
npx cap open ios
# Build in Xcode

# Android
npx cap sync android
npx cap open android
# Build in Android Studio
```

### Step 5: Verify Deployment
- [ ] Test on production environment
- [ ] Check all features work
- [ ] Monitor Firebase Console for errors
- [ ] Verify Cloud Function scheduled correctly

---

## 🎉 Success Criteria

Deployment is successful when:
- ✅ All tests pass
- ✅ No console errors
- ✅ Streaks display correctly
- ✅ Achievements unlock properly
- ✅ Leaderboard shows rankings
- ✅ Cloud Function runs without errors
- ✅ Performance is acceptable
- ✅ No user complaints

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Monitor Cloud Function logs
- Check for error spikes

**Weekly:**
- Review Firestore usage
- Check leaderboard accuracy
- Verify streak calculations

**Monthly:**
- Analyze engagement metrics
- Review achievement unlock rates
- Optimize queries if needed

### Contact Information

**Developer:** [Your Name]
**Date Deployed:** [Deployment Date]
**Version:** 2.1.0 (Streaks & Gamification)

---

**Status:** ✅ Ready for Deployment
**Last Updated:** January 21, 2026
