import { ref, computed } from 'vue';
import { db, auth } from './FirebaseService';
import { doc, getDoc, setDoc, query, collection, orderBy, limit, onSnapshot, updateDoc, arrayUnion, deleteDoc, addDoc, arrayRemove, where, getCountFromServer, startAfter, getDocs, Timestamp, writeBatch } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

export const userBeeId = ref<string | null>(localStorage.getItem('bee_id'));
export const userVisibility = ref<boolean>(localStorage.getItem('bee_visibility') !== 'false');
export const userRole = ref<string | null>(localStorage.getItem('bee_role')); // 'admin', 'super_admin' or null

export const useUserService = () => {

    const saveUserProfile = async (beeId: string, token: string | null, isLogin = false, password?: string) => {
        // 1. Wait for Auth
        if (!auth.currentUser) {
            await new Promise((resolve) => {
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    if (user) { unsubscribe(); resolve(user); }
                });
                setTimeout(() => { unsubscribe(); resolve(null); }, 5000);
            });
        }
        if (!auth.currentUser) throw new Error('Not authenticated');

        const userDoc = doc(db, 'users', beeId);
        const snap = await getDoc(userDoc);

        // 2. LOGIC CHECK:
        const userData = snap.data();
        const isOwner = userData?.uid === auth.currentUser.uid;

        if (!isLogin) {
            // REGISTRATION/UPDATE MODE
            if (snap.exists() && !isOwner) {
                throw new Error('This Bee ID is already claimed by another bee!');
            }

            // Require password on initial registration
            if (!snap.exists()) {
                if (!password || password.length < 4) {
                    throw new Error('Please set a password (min 4 characters).');
                }
            } else if (password && userData && !isOwner) {
                // If they are trying to CHANGE the password or if it exists
                if (userData.password) {
                    const isMatch = await bcrypt.compare(password, userData.password);
                    if (!isMatch && userData.password !== password) { // Fallback for plain text until migrated
                        throw new Error('Incorrect password for this Bee ID.');
                    }
                }
            }
        } else {
            // LOGIN MODE: Block if the ID doesn't exist at all
            if (!snap.exists() || !userData) {
                throw new Error('This Bee ID does not exist in the Hive.');
            }

            // Password verification for login
            if (userData.password) {
                const isMatch = await bcrypt.compare(password || '', userData.password);
                if (!isMatch && userData.password !== password) { // Fallback for plain text
                    throw new Error('Incorrect password for this Bee ID.');
                }
            }

            // Optional: Block if the ID belongs to someone else 
            if (!isOwner) {
                console.warn('Logging into an ID with a different UID. Re-linking...');
            }
        }

        // 3. Perform the write
        const saveData: any = {
            uid: auth.currentUser.uid,
            beeId: beeId,
            pushToken: token || userData?.pushToken || null,
            lastSeen: new Date().toISOString(),
            createdAt: userData?.createdAt || new Date().toISOString(), // Persist or set new
            visibility: userData?.visibility ?? true // Default to visible
        };

        // Only update password during registration or if provided
        if (password) {
            // Hash the password if it's not already hashed (for new entries or updates)
            const salt = await bcrypt.genSalt(10);
            saveData.password = await bcrypt.hash(password, salt);
        }

        // Super Admin ID Check
        const SUPER_ADMIN_ID = 'superadmin';

        if (beeId === SUPER_ADMIN_ID) {
            saveData.role = 'super_admin';
            saveData.visibility = false; // Superadmins are always invisible
        } else if (userData?.role) {
            saveData.role = userData.role; // Persist existing role
        }

        await setDoc(userDoc, saveData, { merge: true });

        localStorage.setItem('bee_id', beeId);
        if (saveData.role) {
            localStorage.setItem('bee_role', saveData.role);
            userRole.value = saveData.role;
        } else {
            localStorage.removeItem('bee_role');
            userRole.value = null;
        }

        userBeeId.value = beeId;
        userVisibility.value = userData?.visibility ?? true;
        return true;
    };

    const updateOnlineStatus = async () => {
        if (!userBeeId.value) return;
        try {
            const userDoc = doc(db, 'users', userBeeId.value);
            await updateDoc(userDoc, {
                lastSeen: new Date().toISOString()
            });
        } catch (e) {
            console.warn('Status update failed (likely offline):', e);
        }
    };

    const getRecipientToken = async (beeId: string) => {
        if (beeId === 'superadmin') return { exists: false, token: null };
        const userDoc = doc(db, 'users', beeId);
        const snap = await getDoc(userDoc);
        if (snap.exists()) {
            return {
                exists: true,
                token: snap.data().pushToken
            };
        }
        return { exists: false, token: null };
    };

    const getAllBees = () => {
        const CACHE_KEY = 'notibee_all_bees';
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        const bees = ref<any[]>(cached);
        // Increase limit to 50 for better visibility in the Hive
        const q = query(collection(db, 'users'), orderBy('lastSeen', 'desc'), limit(50));

        onSnapshot(q, (snap) => {
            bees.value = snap.docs
                .map(doc => doc.data())
                .filter(b => b.beeId !== 'superadmin'); // Hide superadmin
            localStorage.setItem(CACHE_KEY, JSON.stringify(bees.value));
        });

        return bees;
    };

    const getColonyMembers = (friendIds: string[]) => {
        const members = ref<any[]>([]);
        const noop = () => { };
        if (!friendIds || friendIds.length === 0) return { members, unsubscribe: noop };

        // Firestore 'in' queries are limited to 30 items. 
        // For a hobby app, this is usually enough. For more, we'd need multiple queries.
        const q = query(
            collection(db, 'users'),
            where('beeId', 'in', friendIds.slice(0, 30))
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            members.value = snap.docs
                .map(doc => doc.data())
                .filter(b => b.beeId !== 'superadmin'); // Hide superadmin
        });

        return { members, unsubscribe };
    };

    const sendFriendRequest = async (targetBeeId: string) => {
        if (!userBeeId.value || targetBeeId === userBeeId.value || targetBeeId === 'superadmin') return;

        // Add to target's requests subcollection
        const requestDoc = doc(db, 'users', targetBeeId, 'requests', userBeeId.value);
        await setDoc(requestDoc, {
            from: userBeeId.value,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });

        // Also trigger a real-time bubble via inbox (Free Relay)
        const targetToken = (await getRecipientToken(targetBeeId)).token;
        const inboxRef = collection(db, 'users', targetBeeId, 'inbox');
        await addDoc(inboxRef, {
            from: userBeeId.value,
            message: `wants to join your Nest! 🍯`,
            type: 'FRIEND_REQUEST',
            timestamp: new Date().toISOString()
        });
    };

    const getPendingRequests = () => {
        const CACHE_KEY = `notibee_requests_${userBeeId.value}`;
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        const requests = ref<any[]>(cached);
        if (!userBeeId.value) return requests;

        const q = query(collection(db, 'users', userBeeId.value, 'requests'), orderBy('timestamp', 'desc'));
        onSnapshot(q, (snap) => {
            requests.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem(CACHE_KEY, JSON.stringify(requests.value));
        });
        return requests;
    };

    const acceptFriendRequest = async (requestorBeeId: string) => {
        if (!userBeeId.value) return;

        const myDoc = doc(db, 'users', userBeeId.value);
        const theirDoc = doc(db, 'users', requestorBeeId);

        // 1. Add each other to friends arrays
        await updateDoc(myDoc, { friends: arrayUnion(requestorBeeId) });
        await updateDoc(theirDoc, { friends: arrayUnion(userBeeId.value) });

        // 2. Delete the request document
        await deleteDoc(doc(db, 'users', userBeeId.value, 'requests', requestorBeeId));

        // 3. Check for achievements (Social Bee, etc)
        const { checkAchievements } = await import('./StreakService').then(m => m.useStreakService());
        await checkAchievements(userBeeId.value);
    };

    const rejectFriendRequest = async (requestorBeeId: string) => {
        if (!userBeeId.value) return;
        await deleteDoc(doc(db, 'users', userBeeId.value, 'requests', requestorBeeId));
    };

    const removeFriend = async (friendBeeId: string) => {
        if (!userBeeId.value) return;
        const userDoc = doc(db, 'users', userBeeId.value);
        await updateDoc(userDoc, {
            friends: arrayRemove(friendBeeId)
        });
    };

    const addFriend = sendFriendRequest; // Alias for now to avoid breaking existing UI

    const getFriends = () => {
        const CACHE_KEY = `notibee_friends_${userBeeId.value}`;
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        const friends = ref<string[]>(cached);
        if (!userBeeId.value) return friends;

        const userDoc = doc(db, 'users', userBeeId.value);
        onSnapshot(userDoc, (snap) => {
            if (snap.exists()) {
                friends.value = snap.data().friends || [];
                localStorage.setItem(CACHE_KEY, JSON.stringify(friends.value));
            }
        });
        return friends;
    };

    const deleteUserAccount = async () => {
        if (!userBeeId.value || !auth.currentUser) return;

        try {
            const beeId = userBeeId.value;
            const uid = auth.currentUser.uid;

            // 1. Delete from users collection
            await deleteDoc(doc(db, 'users', beeId));

            clearLocalData();
            return true;
        } catch (e) {
            console.error('Delete Account Error:', e);
            throw e;
        }
    };

    const clearLocalData = () => {
        localStorage.clear();
        sessionStorage.clear();
        userBeeId.value = null;
        // Reload to clear memory cache
        window.location.reload();
    };

    const updateLocation = async (lat: number, lng: number, visibility: boolean) => {
        if (!userBeeId.value) return;

        // Sanitize inputs to avoid DataCloneError with Proxy/undefined
        const cleanLat = Number(lat);
        const cleanLng = Number(lng);

        if (isNaN(cleanLat) || isNaN(cleanLng)) {
            console.warn('Invalid coordinates received, skipping update:', lat, lng);
            return;
        }

        try {
            const userDoc = doc(db, 'users', userBeeId.value);
            await updateDoc(userDoc, {
                location: {
                    lat: cleanLat,
                    lng: cleanLng
                },
                visibility: !!visibility,
                lastSeen: new Date().toISOString()
            });
        } catch (e) {
            console.warn('Location update failed (background/offline):', e);
        }
    };

    const getVisibleBees = () => {
        const bees = ref<any[]>([]);
        // Query users where visibility is true
        const q = query(
            collection(db, 'users'),
            where('visibility', '==', true),
            limit(100)
        );

        onSnapshot(q, (snap) => {
            bees.value = snap.docs
                .map(doc => doc.data())
                .filter(b => b.beeId !== 'superadmin'); // Hide superadmin
        });

        return bees;
    };

    const updateVisibility = async (visibility: boolean) => {
        if (!userBeeId.value) return;
        userVisibility.value = visibility;
        localStorage.setItem('bee_visibility', visibility.toString());
        const userDoc = doc(db, 'users', userBeeId.value);
        await updateDoc(userDoc, { visibility });
    };

    const updateBio = async (bio: string) => {
        if (!userBeeId.value) return;
        const userDoc = doc(db, 'users', userBeeId.value);
        await updateDoc(userDoc, { bio });
    };

    const updateBeeCustomization = async (selections: { top: string, body: string, eyes: string }) => {
        if (!userBeeId.value) return;
        const userDoc = doc(db, 'users', userBeeId.value);
        await updateDoc(userDoc, { customization: selections });
    };

    const updateProfile = async (updates: {
        bio?: string,
        status?: string,
        gender?: string,
        hobbies?: string[],
        age?: number | null,
        relationship?: string
    }) => {
        if (!userBeeId.value) return;
        const userDoc = doc(db, 'users', userBeeId.value);
        await updateDoc(userDoc, updates);
    };

    const getUserProfile = async (beeId: string) => {
        if (beeId === 'superadmin') return null;
        const userDoc = doc(db, 'users', beeId);
        const snap = await getDoc(userDoc);
        if (snap.exists()) {
            return snap.data();
        }
        return null;
    };

    /**
     * Record a profile visit
     */
    const recordProfileVisit = async (profileBeeId: string) => {
        if (!userBeeId.value || profileBeeId === userBeeId.value || profileBeeId === 'superadmin') return;

        try {
            const visitsRef = collection(db, 'users', profileBeeId, 'profile_visits');
            const visitDoc = doc(visitsRef, userBeeId.value);

            // 1. Add/Update the visit
            await setDoc(visitDoc, {
                visitorId: userBeeId.value,
                timestamp: new Date().toISOString()
            }, { merge: true });

            // 2. Enforce limit: Keep only top 30 recent visitors
            const q = query(visitsRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);

            if (snapshot.size > 30) {
                const docsToDelete = snapshot.docs.slice(30);
                const batch = writeBatch(db);
                docsToDelete.forEach(d => {
                    batch.delete(d.ref);
                });
                await batch.commit();
            }

        } catch (error) {
            console.error('Error recording profile visit:', error);
        }
    };

    /**
     * Get profile visits for a user
     */
    const getProfileVisits = (beeId: string) => {
        const visits = ref<any[]>([]);
        const q = query(
            collection(db, 'users', beeId, 'profile_visits'),
            orderBy('timestamp', 'desc'),
            limit(30)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            visits.value = snap.docs.map(doc => doc.data());
        });

        return { visits, unsubscribe };
    };

    const promoteToAdmin = async (beeId: string) => {
        const userDoc = doc(db, 'users', beeId);
        await updateDoc(userDoc, { role: 'admin' });
    };

    const demoteFromAdmin = async (beeId: string) => {
        const userDoc = doc(db, 'users', beeId);
        await updateDoc(userDoc, { role: null });
    };

    const isAdmin = computed(() => {
        if (userBeeId.value === 'superadmin') return true;
        return userRole.value === 'admin' || userRole.value === 'super_admin';
    });
    const isSuperAdmin = computed(() => {
        return userRole.value === 'super_admin' || userBeeId.value === 'superadmin';
    });

    /**
     * Get Admin Analytics
     */
    const getAdminAnalytics = async () => {
        if (!isSuperAdmin.value) return null;

        const usersColl = collection(db, 'users');
        const storiesColl = collection(db, 'stories');
        const reportsColl = collection(db, 'reports');

        // 1. Total Users
        const totalUsersSnap = await getCountFromServer(usersColl);
        const totalUsers = totalUsersSnap.data().count;

        // 2. Online Users (Last 5 mins)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const onlineQuery = query(usersColl, where('lastSeen', '>=', fiveMinsAgo));
        const onlineUsersSnap = await getCountFromServer(onlineQuery);
        const onlineUsers = onlineUsersSnap.data().count;

        // 3. New Users Today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const newUsersQuery = query(usersColl, where('createdAt', '>=', startOfToday.toISOString()));
        const newUsersSnap = await getCountFromServer(newUsersQuery);
        const newUsersToday = newUsersSnap.data().count;

        // 4. Total Stories (Nectar)
        const totalStoriesSnap = await getCountFromServer(storiesColl);

        // 5. Active Reports
        const reportsSnap = await getCountFromServer(reportsColl);

        // 6. Calculate Activity Pulse (Last 24 hours in 12 buckets)
        const pulseBuckets: number[] = [];
        const nowMs = Date.now();

        // We do 12 buckets of 2 hours each
        for (let i = 12; i >= 1; i--) {
            const bucketStart = new Date(nowMs - i * 2 * 60 * 60 * 1000).toISOString();
            const bucketEnd = new Date(nowMs - (i - 1) * 2 * 60 * 60 * 1000).toISOString();

            // Note: Since we only have 'lastSeen', this is an approximation 
            // of how many users' LAST action fell into this bucket.
            const q = query(usersColl,
                where('lastSeen', '>=', bucketStart),
                where('lastSeen', '<', bucketEnd)
            );
            const snap = await getCountFromServer(q);
            pulseBuckets.push(snap.data().count);
        }

        // 7. Calculate Harvest Growth (Last 24 hours in 6 buckets)
        const harvestBuckets: { label: string, value: number }[] = [];
        for (let i = 6; i >= 1; i--) {
            const start = new Date(nowMs - i * 4 * 60 * 60 * 1000);
            const end = new Date(nowMs - (i - 1) * 4 * 60 * 60 * 1000);

            const q = query(storiesColl,
                where('createdAt', '>=', Timestamp.fromDate(start)),
                where('createdAt', '<', Timestamp.fromDate(end))
            );
            const snap = await getCountFromServer(q);

            harvestBuckets.push({
                label: `${end.getHours()}:00`,
                value: snap.data().count
            });
        }

        return {
            totalUsers,
            onlineUsers,
            newUsersToday,
            totalStories: totalStoriesSnap.data().count,
            pendingReports: reportsSnap.data().count,
            activityPulse: pulseBuckets,
            harvestHistory: harvestBuckets
        };
    };

    /**
     * Get Paginated Users for Directory
     */
    const getPagedUsers = async (lastVisibleDoc: any = null, limitCount: number = 30) => {
        if (!isSuperAdmin.value) return { users: [], lastDoc: null };

        let q;
        if (lastVisibleDoc) {
            q = query(
                collection(db, 'users'),
                orderBy('beeId', 'asc'),
                startAfter(lastVisibleDoc),
                limit(limitCount)
            );
        } else {
            q = query(
                collection(db, 'users'),
                orderBy('beeId', 'asc'),
                limit(limitCount)
            );
        }

        const snap = await getDocs(q);
        const users = snap.docs.map(d => d.data()).filter(u => u.beeId !== 'superadmin');
        const lastDoc = snap.docs[snap.docs.length - 1];

        return { users, lastDoc };
    };

    const adminDeleteUser = async (beeId: string) => {
        if (!isAdmin.value) throw new Error('Unauthorized');
        await deleteDoc(doc(db, 'users', beeId));
        // Cleanup report
        await deleteDoc(doc(db, 'reports', `user_${beeId}`));
    };

    /**
     * Report a User
     */
    const reportUser = async (targetBeeId: string, reason: string) => {
        if (!userBeeId.value) throw new Error('Not logged in');
        const reportRef = doc(db, 'reports', `user_${targetBeeId}`);
        await setDoc(reportRef, {
            targetBeeId,
            reporters: arrayUnion(userBeeId.value),
            reasons: arrayUnion(reason),
            timestamp: Timestamp.now(),
            status: 'pending',
            type: 'user_report'
        }, { merge: true });
    };

    return {
        userBeeId,
        userVisibility,
        userRole,
        isAdmin,
        isSuperAdmin,
        saveUserProfile,
        getRecipientToken,
        getAllBees,
        addFriend,
        removeFriend,
        getFriends,
        getColonyMembers,
        getPendingRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        deleteUserAccount,
        adminDeleteUser,
        clearLocalData,
        updateOnlineStatus,
        updateLocation,
        getVisibleBees,
        updateVisibility,
        updateBio,
        updateProfile,
        getUserProfile,
        updateBeeCustomization,
        recordProfileVisit,
        getProfileVisits,
        promoteToAdmin,
        demoteFromAdmin,
        getAdminAnalytics,
        getPagedUsers,
        reportUser
    };
};
