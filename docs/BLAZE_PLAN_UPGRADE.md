# 🔥 Firebase Blaze Plan Upgrade Guide

## ⚠️ Required: Upgrade to Blaze Plan

Cloud Functions require the **Blaze (Pay-as-you-go)** plan. Here's what you need to know:

## Why Blaze Plan is Required

Firebase Cloud Functions run on Google Cloud infrastructure and require the Blaze plan. However, **it's likely to cost $0/month** due to the generous free tier.

## 💰 Free Tier Limits (More than Enough!)

### Cloud Functions
- ✅ **2,000,000 invocations/month** - FREE
- ✅ **400,000 GB-seconds** compute time - FREE
- ✅ **200,000 CPU-seconds** - FREE
- ✅ **5 GB network egress** - FREE

### Firebase Cloud Messaging
- ✅ **Unlimited messages** - FREE

### Firestore
- ✅ **50,000 reads/day** - FREE
- ✅ **20,000 writes/day** - FREE
- ✅ **20,000 deletes/day** - FREE
- ✅ **1 GB storage** - FREE

## 📊 Estimated Usage for NotiBee

For **1,000 active users** sending **30 buzzes/day each**:

### Monthly Usage
- **Notifications**: ~900,000/month
- **Function invocations**: ~900,000/month
- **Firestore writes**: ~900,000/month
- **Firestore reads**: ~1,800,000/month

### Cost Breakdown
- **Cloud Functions**: $0 (within 2M free tier)
- **FCM**: $0 (unlimited free)
- **Firestore**: $0 (within free tier)

**Total: $0/month** 🎉

## 🚀 How to Upgrade to Blaze Plan

### Option 1: Use the Direct Link (Easiest)
Click this link to upgrade:
👉 https://console.firebase.google.com/project/notibee-441b2/usage/details

### Option 2: Manual Steps
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **notibee-441b2**
3. Click the ⚙️ gear icon → **Usage and billing**
4. Click **Modify plan**
5. Select **Blaze (Pay as you go)**
6. Follow the prompts to add a payment method

## 💳 Payment Method Required

You'll need to add a credit/debit card, but:
- ✅ You won't be charged unless you exceed free tier limits
- ✅ You can set spending limits to prevent unexpected charges
- ✅ You'll receive alerts before hitting any limits

## 🛡️ Set Up Budget Alerts (Recommended)

After upgrading:

1. Go to **Usage and billing** in Firebase Console
2. Click **Set budget alerts**
3. Set a budget (e.g., $5/month)
4. You'll get email alerts at 50%, 90%, and 100% of budget

## ✅ After Upgrading

Once you've upgraded to the Blaze plan:

1. **Deploy Cloud Functions**:
   ```powershell
   firebase deploy --only functions
   ```

2. **Verify Deployment**:
   ```powershell
   firebase functions:list
   ```

3. **Test Notifications**:
   - Test with app open (real-time)
   - Test with app closed (background push)

## 🔍 Monitor Your Usage

### Check Current Usage
```powershell
firebase projects:list
```

### View Function Logs
```powershell
firebase functions:log --limit 50
```

### Firebase Console Dashboard
Go to: https://console.firebase.google.com/project/notibee-441b2/usage

You can see:
- Function invocations
- Firestore operations
- Storage usage
- Estimated costs

## ❓ Common Questions

### Q: Will I be charged immediately?
**A:** No, you only pay if you exceed the free tier limits.

### Q: What if I exceed the free tier?
**A:** You'll be charged only for the excess usage. Set budget alerts to prevent surprises.

### Q: Can I downgrade later?
**A:** Yes, but you'll lose access to Cloud Functions.

### Q: Is there an alternative to Cloud Functions?
**A:** Not for background push notifications when the app is closed. Cloud Functions are the standard solution.

## 🎯 Summary

1. ✅ Upgrade to Blaze plan (required for Cloud Functions)
2. ✅ Add payment method (won't be charged unless you exceed free tier)
3. ✅ Set budget alerts (recommended: $5/month)
4. ✅ Deploy Cloud Functions
5. ✅ Test notifications
6. ✅ Monitor usage

**Expected monthly cost: $0** (within free tier limits)

## 🔗 Quick Links

- **Upgrade Now**: https://console.firebase.google.com/project/notibee-441b2/usage/details
- **Pricing Details**: https://firebase.google.com/pricing
- **Usage Dashboard**: https://console.firebase.google.com/project/notibee-441b2/usage

---

**Ready to upgrade?** Click the link above and follow the prompts. It takes less than 2 minutes! 🚀
