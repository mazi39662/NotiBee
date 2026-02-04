import { ref, computed } from 'vue';
import { db, auth } from './FirebaseService';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    deleteDoc,
    doc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAdService, Ad } from './AdService';

export interface Comment {
    id: string;
    beeId: string;
    text: string;
    createdAt: number;
    reactions?: Record<string, string[]>; // { "❤️": ["beeId1", "beeId2"], ... }
    status?: 'sending' | 'sent' | 'error';
}

export interface Story {
    id: string;
    beeId: string;
    imageUrl?: string; // Single image
    imageUrls?: string[]; // Multiple images for carousel
    audioUrl?: string; // For audio posts
    audioDuration?: number; // Duration in seconds
    caption?: string;
    textContent?: string; // For text-only posts
    backgroundColor?: string; // Background color for text posts
    createdAt: number;
    expiresAt: number;
    likes: string[]; // Array of beeIds who liked
    views: string[]; // Array of beeIds who viewed
    comments?: Comment[]; // Optional array of comments
}

export type FeedItem = Story | Ad;

const stories = ref<Story[]>([]);
const myStories = ref<Story[]>([]);
const isLoading = ref(false);
const lastVisible = ref<any>(null);
const hasMore = ref(true);
const PAGE_SIZE = 15;

/**
 * Compresses an image data URL to be under Firestore document limits (~1MB)
 */
const compressImage = async (dataUrl: string, maxWidth = 1080, maxHeight = 1920): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onerror = (e) => reject(new Error('Failed to load image for compression'));
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(dataUrl);
                return;
            }

            let width = img.width;
            let height = img.height;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Start with 0.6 quality and reduce if needed to stay under ~800KB base64
            let quality = 0.6;
            let result = canvas.toDataURL('image/jpeg', quality);

            // 800,000 chars in base64 is roughly 600KB of binary data
            // Well within the 1,048,487 bytes limit of Firestore
            while (result.length > 800000 && quality > 0.1) {
                quality -= 0.1;
                result = canvas.toDataURL('image/jpeg', quality);
            }

            resolve(result);
        };
        img.src = dataUrl;
    });
};

export function useMyDaysService() {
    const currentUserBeeId = localStorage.getItem('bee_id');

    /**
     * Create a text-only story
     */
    const createTextStory = async (text: string, backgroundColor: string = '#ffbf00'): Promise<void> => {
        if (!currentUserBeeId) throw new Error('No Bee ID found');
        if (!text.trim()) throw new Error('Text cannot be empty');

        try {
            isLoading.value = true;

            const now = Date.now();
            const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now

            // Save to Firestore
            await addDoc(collection(db, 'stories'), {
                beeId: currentUserBeeId,
                textContent: text.trim(),
                backgroundColor: backgroundColor,
                createdAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(expiresAt),
                likes: [],
                views: [],
                comments: []
            });

            // Refresh stories
            await fetchStories();
        } catch (error: any) {
            console.error('Error creating text story:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Take a photo and create a new story
     */
    const createStory = async (caption?: string): Promise<void> => {
        if (!currentUserBeeId) throw new Error('No Bee ID found');

        try {
            isLoading.value = true;

            // Take photo
            const image = await Camera.getPhoto({
                quality: 80,
                allowEditing: true,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                width: 1080,
                height: 1920,
                correctOrientation: true
            });

            if (!image.dataUrl) throw new Error('No image captured');

            // Compress image before saving to Firestore
            const compressedImageData = await compressImage(image.dataUrl);

            const now = Date.now();
            const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now

            // Save to Firestore
            await addDoc(collection(db, 'stories'), {
                beeId: currentUserBeeId,
                imageUrl: compressedImageData,
                caption: caption || '',
                createdAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(expiresAt),
                likes: [],
                views: [],
                comments: []
            });

            // Refresh stories
            await fetchStories();
        } catch (error: any) {
            console.error('Error creating story:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Upload an existing image as a story
     */
    const uploadStory = async (caption?: string, existingImageData?: string): Promise<void> => {
        if (!currentUserBeeId) throw new Error('No Bee ID found');

        try {
            isLoading.value = true;
            let imageDataUrl = existingImageData;

            // If no image provided, pick from gallery
            if (!imageDataUrl) {
                const image = await Camera.getPhoto({
                    quality: 80,
                    allowEditing: true,
                    resultType: CameraResultType.DataUrl,
                    source: CameraSource.Photos,
                    width: 1080,
                    height: 1920,
                    correctOrientation: true
                });
                imageDataUrl = image.dataUrl;
            }

            if (!imageDataUrl) throw new Error('No image selected');

            // Compress image before saving to Firestore
            const compressedImageData = await compressImage(imageDataUrl);

            const now = Date.now();
            const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now

            // Save to Firestore
            await addDoc(collection(db, 'stories'), {
                beeId: currentUserBeeId,
                imageUrl: compressedImageData,
                caption: caption || '',
                createdAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(expiresAt),
                likes: [],
                views: [],
                comments: []
            });

            // Refresh stories
            await fetchStories();
        } catch (error: any) {
            console.error('Error uploading story:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Create an audio story
     */
    const createAudioStory = async (audioUrl: string, duration: number, caption?: string): Promise<void> => {
        if (!currentUserBeeId) throw new Error('No Bee ID found');

        try {
            isLoading.value = true;
            const now = Date.now();
            const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now

            // Save to Firestore
            await addDoc(collection(db, 'stories'), {
                beeId: currentUserBeeId,
                audioUrl: audioUrl,
                audioDuration: duration,
                caption: caption || '',
                createdAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(expiresAt),
                likes: [],
                views: [],
                comments: []
            });

            // Refresh stories
            await fetchStories();
        } catch (error: any) {
            console.error('Error creating audio story:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Fetch all active stories (not expired)
     */
    const fetchStories = async (isLoadMore = false): Promise<void> => {
        try {
            // Only show loading spinner if we have no data and not loading more
            if (!isLoadMore && stories.value.length === 0) {
                isLoading.value = true;
            }

            const now = Timestamp.now();
            let q;

            if (isLoadMore) {
                if (!lastVisible.value) return;

                q = query(
                    collection(db, 'stories'),
                    where('expiresAt', '>', now),
                    orderBy('expiresAt', 'desc'),
                    startAfter(lastVisible.value),
                    limit(PAGE_SIZE)
                );
            } else {
                // Reset hasMore on refresh
                hasMore.value = true;

                q = query(
                    collection(db, 'stories'),
                    where('expiresAt', '>', now),
                    orderBy('expiresAt', 'desc'),
                    limit(PAGE_SIZE)
                );
            }

            const snapshot = await getDocs(q);

            // Check limits
            if (snapshot.docs.length < PAGE_SIZE) {
                hasMore.value = false;
            }

            if (snapshot.docs.length > 0) {
                lastVisible.value = snapshot.docs[snapshot.docs.length - 1];
            } else {
                if (isLoadMore) hasMore.value = false;
            }

            const fetchedStories: Story[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedStories.push({
                    id: doc.id,
                    beeId: data.beeId,
                    imageUrl: data.imageUrl,
                    imageUrls: data.imageUrls || [],
                    audioUrl: data.audioUrl,
                    audioDuration: data.audioDuration,
                    caption: data.caption,
                    textContent: data.textContent,
                    backgroundColor: data.backgroundColor,
                    createdAt: data.createdAt.toMillis(),
                    expiresAt: data.expiresAt.toMillis(),
                    likes: data.likes || [],
                    views: data.views || [],
                    comments: data.comments || []
                });
            });

            if (isLoadMore) {
                // Append
                const existingIds = new Set(stories.value.map(s => s.id));
                const newStories = fetchedStories.filter(s => !existingIds.has(s.id));
                stories.value = [...stories.value, ...newStories];
            } else {
                // Replace
                stories.value = fetchedStories;

                // Cache ONLY the first page
                try {
                    localStorage.setItem('cached_stories', JSON.stringify(fetchedStories));
                } catch (e) {
                    console.warn('Failed to cache stories', e);
                }
            }

            // Update myStories
            if (currentUserBeeId) {
                myStories.value = stories.value.filter(s => s.beeId === currentUserBeeId);
            }

        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Load stories from cache immediately
     */
    const loadCachedStories = () => {
        try {
            const cached = localStorage.getItem('cached_stories');
            if (cached) {
                const parsedStories = JSON.parse(cached);
                if (Array.isArray(parsedStories) && parsedStories.length > 0) {
                    stories.value = parsedStories;
                    if (currentUserBeeId) {
                        myStories.value = parsedStories.filter((s: Story) => s.beeId === currentUserBeeId);
                    }
                }
            }
        } catch (e) {
            console.error('Error loading cached stories 1:', e);
        }
    };

    /**
     * Initialize real-time stories listener
     */
    const initStoriesListener = () => {
        const now = Timestamp.now();
        const q = query(
            collection(db, 'stories'),
            where('expiresAt', '>', now),
            orderBy('expiresAt', 'desc'),
            limit(PAGE_SIZE)
        );

        return onSnapshot(q, (snapshot) => {
            const fetchedStories: Story[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedStories.push({
                    id: doc.id,
                    beeId: data.beeId,
                    imageUrl: data.imageUrl,
                    imageUrls: data.imageUrls || [],
                    audioUrl: data.audioUrl,
                    audioDuration: data.audioDuration,
                    caption: data.caption,
                    textContent: data.textContent,
                    backgroundColor: data.backgroundColor,
                    createdAt: data.createdAt.toMillis(),
                    expiresAt: data.expiresAt.toMillis(),
                    likes: data.likes || [],
                    views: data.views || [],
                    comments: data.comments || []
                });
            });

            // Replace current stories with real-time data
            stories.value = fetchedStories;

            if (currentUserBeeId) {
                myStories.value = fetchedStories.filter(s => s.beeId === currentUserBeeId);
            }

            // Update cache
            try {
                localStorage.setItem('cached_stories', JSON.stringify(fetchedStories));
            } catch (e) {
                console.warn('Failed to cache stories', e);
            }
        });
    };

    // Load cache on init
    loadCachedStories();

    /**
     * Delete expired stories (cleanup function)
     */
    const deleteExpiredStories = async (): Promise<void> => {
        try {
            const now = Timestamp.now();
            const q = query(
                collection(db, 'stories'),
                where('expiresAt', '<=', now)
            );

            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(storyDoc => {
                const storyId = storyDoc.id;
                // Delete the story itself
                const d1 = deleteDoc(storyDoc.ref);
                // Delete the aggregated report if it exists
                const d2 = deleteDoc(doc(db, 'reports', `story_${storyId}`));
                return [d1, d2];
            }).flat();
            await Promise.all(deletePromises);

            console.log(`Deleted ${deletePromises.length} expired stories`);
        } catch (error) {
            console.error('Error deleting expired stories:', error);
        }
    };

    /**
     * Delete a specific story (only owner can delete)
     */
    const deleteStory = async (storyId: string): Promise<void> => {
        try {
            const story = stories.value.find(s => s.id === storyId);
            if (!story || story.beeId !== currentUserBeeId) {
                throw new Error('Cannot delete this story');
            }

            await deleteDoc(doc(db, 'stories', storyId));
            await fetchStories();
        } catch (error) {
            console.error('Error deleting story:', error);
            throw error;
        }
    };

    /**
     * Like a story
     */
    const likeStory = async (storyId: string): Promise<void> => {
        if (!currentUserBeeId) return;

        try {
            const story = stories.value.find(s => s.id === storyId);
            if (story && story.beeId === currentUserBeeId) return;

            const storyRef = doc(db, 'stories', storyId);
            await updateDoc(storyRef, {
                likes: arrayUnion(currentUserBeeId)
            });

            // Earn Honey Drops for Pollinating
            const { addHoneyDrops } = await import('./HoneyService').then(m => m.useHoneyService());
            await addHoneyDrops('POLLINATE');
        } catch (error) {
            console.error('Error liking story:', error);
            throw error;
        }
    };

    /**
     * Unlike a story
     */
    const unlikeStory = async (storyId: string): Promise<void> => {
        if (!currentUserBeeId) return;

        try {
            const storyRef = doc(db, 'stories', storyId);
            await updateDoc(storyRef, {
                likes: arrayRemove(currentUserBeeId)
            });
        } catch (error) {
            console.error('Error unliking story:', error);
            throw error;
        }
    };

    /**
     * Mark story as viewed
     */
    const markAsViewed = async (storyId: string): Promise<void> => {
        if (!currentUserBeeId) return;

        try {
            const story = stories.value.find(s => s.id === storyId);
            if (story && !story.views.includes(currentUserBeeId) && story.beeId !== currentUserBeeId) {
                const storyRef = doc(db, 'stories', storyId);
                await updateDoc(storyRef, {
                    views: arrayUnion(currentUserBeeId)
                });

                // Earn Honey Drops for Gathering Nectar (Viewing)
                const { addHoneyDrops } = await import('./HoneyService').then(m => m.useHoneyService());
                await addHoneyDrops('VIEW');
            }
        } catch (error) {
            console.error('Error marking story as viewed:', error);
        }
    };

    /**
     * Add a comment to a story
     */
    const addComment = async (storyId: string, text: string): Promise<void> => {
        if (!currentUserBeeId || !text.trim()) return;

        try {
            const story = stories.value.find(s => s.id === storyId);
            if (!story) return;

            const comment: Comment = {
                id: Math.random().toString(36).substring(2, 9),
                beeId: currentUserBeeId,
                text: text.trim(),
                createdAt: Date.now()
            };

            const storyRef = doc(db, 'stories', storyId);
            await updateDoc(storyRef, {
                comments: arrayUnion(comment)
            });

            // Earn Honey Drops for Commenting (only on others' stories)
            if (story.beeId !== currentUserBeeId) {
                const { addHoneyDrops } = await import('./HoneyService').then(m => m.useHoneyService());
                await addHoneyDrops('COMMENT');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    };

    /**
     * React to a comment with an emoji
     */
    const reactToComment = async (storyId: string, commentId: string, emoji: string): Promise<void> => {
        if (!currentUserBeeId) return;

        try {
            const story = stories.value.find(s => s.id === storyId);
            if (!story || !story.comments || story.beeId === currentUserBeeId) return;

            const commentIndex = story.comments.findIndex(c => c.id === commentId);
            if (commentIndex === -1) return;

            const newComments = [...story.comments];
            const comment = { ...newComments[commentIndex] };

            if (!comment.reactions) comment.reactions = {};

            // Toggle reaction
            const currentReactionBeeIds = comment.reactions[emoji] || [];
            const index = currentReactionBeeIds.indexOf(currentUserBeeId);

            if (index > -1) {
                currentReactionBeeIds.splice(index, 1);
            } else {
                currentReactionBeeIds.push(currentUserBeeId);
            }

            comment.reactions[emoji] = currentReactionBeeIds;
            newComments[commentIndex] = comment;

            const storyRef = doc(db, 'stories', storyId);
            await updateDoc(storyRef, {
                comments: newComments
            });

            // Earn drops for pollinating
            const { addHoneyDrops } = await import('./HoneyService').then(m => m.useHoneyService());
            await addHoneyDrops('POLLINATE');
        } catch (error) {
            console.error('Error reacting to comment:', error);
        }
    };

    /**
     * Get stories grouped by user
     */
    const getStoriesByUser = computed(() => {
        const grouped = new Map<string, Story[]>();

        stories.value.forEach(story => {
            if (!grouped.has(story.beeId)) {
                grouped.set(story.beeId, []);
            }
            grouped.get(story.beeId)!.push(story);
        });

        return grouped;
    });

    /**
     * Check if current user has liked a story
     */
    const hasLiked = (storyId: string): boolean => {
        if (!currentUserBeeId) return false;
        const story = stories.value.find(s => s.id === storyId);
        return story ? story.likes.includes(currentUserBeeId) : false;
    };

    /**
     * Get time remaining for a story
     */
    const getTimeRemaining = (expiresAt: number): string => {
        const now = Date.now();
        const remaining = expiresAt - now;

        if (remaining <= 0) return 'Expired';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    /**
     * Fetch stories for a specific user
     */
    const fetchUserStories = async (targetBeeId: string): Promise<Story[]> => {
        try {
            const nowMillis = Date.now();
            const q = query(
                collection(db, 'stories'),
                where('beeId', '==', targetBeeId)
            );

            const snapshot = await getDocs(q);
            const userStories = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    beeId: data.beeId,
                    imageUrl: data.imageUrl,
                    imageUrls: data.imageUrls || [],
                    audioUrl: data.audioUrl,
                    audioDuration: data.audioDuration,
                    caption: data.caption,
                    textContent: data.textContent,
                    backgroundColor: data.backgroundColor,
                    createdAt: data.createdAt.toMillis(),
                    expiresAt: data.expiresAt.toMillis(),
                    likes: data.likes || [],
                    views: data.views || [],
                    comments: data.comments || []
                };
            });

            // Filter expired and sort by most recent expiration in memory 
            return userStories
                .filter(s => s.expiresAt > nowMillis)
                .sort((a, b) => b.expiresAt - a.expiresAt);
        } catch (error) {
            console.error('Error fetching user stories:', error);
            return [];
        }
    };

    /**
     * Report a story
     */
    const reportStory = async (storyId: string, reason: string): Promise<void> => {
        if (!currentUserBeeId) throw new Error('No Bee ID found');

        try {
            const story = stories.value.find(s => s.id === storyId);
            if (!story) throw new Error('Story not found');

            const reportRef = doc(db, 'reports', `story_${storyId}`);
            await setDoc(reportRef, {
                storyId,
                authorId: story.beeId,
                reporters: arrayUnion(currentUserBeeId),
                reasons: arrayUnion(reason),
                timestamp: Timestamp.now(),
                status: 'pending',
                type: 'story_report'
            }, { merge: true });
        } catch (error) {
            console.error('Error reporting story:', error);
            throw error;
        }
    };

    /**
     * Admin delete a story
     */
    const adminDeleteStory = async (storyId: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, 'stories', storyId));
            await deleteDoc(doc(db, 'reports', `story_${storyId}`));
            // Also legacy cleanup just in case there are old format reports
            const q = query(collection(db, 'reports'), where('storyId', '==', storyId));
            const reportSnaps = await getDocs(q);
            const deletePromises = reportSnaps.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);

            await fetchStories();
        } catch (error) {
            console.error('Error admin deleting story:', error);
            throw error;
        }
    };

    /**
     * Batch upload multiple images as stories
     */
    const batchUploadStories = async (images: { dataUrl: string, caption?: string }[]): Promise<void> => {
        if (!currentUserBeeId) throw new Error('No Bee ID found');
        if (images.length === 0) return;

        try {
            isLoading.value = true;
            const now = Date.now();
            const expiresAt = now + (24 * 60 * 60 * 1000);

            // Compress all images. Note: We use a slightly more aggressive compression for batches
            // to avoid hitting Firestore document size limits.
            const compressedImages = await Promise.all(
                images.map(img => compressImage(img.dataUrl, 800, 1400))
            );

            // Use the first caption for the whole batch (common practice)
            const overallCaption = images[0].caption || '';

            await addDoc(collection(db, 'stories'), {
                beeId: currentUserBeeId,
                imageUrls: compressedImages,
                caption: overallCaption,
                createdAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(expiresAt),
                likes: [],
                views: [],
                comments: []
            });

            await fetchStories();
        } catch (error: any) {
            console.error('Error in batch upload:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    const { ads, fetchAds } = useAdService();

    /**
     * Get integrated stories with ads interspersed
     */
    const integratedStories = computed<FeedItem[]>(() => {
        const result: FeedItem[] = [];
        const adsList = ads.value;
        let adIndex = 0;

        stories.value.forEach((story, index) => {
            result.push(story);

            // Insert an ad every 5 stories if ads are available
            const shouldInsertAd = (index + 1) % 5 === 0 && adIndex < adsList.length;
            if (shouldInsertAd) {
                result.push(adsList[adIndex]);
                adIndex++;

                // Reset adIndex if we want to loop through ads or stop if we run out
                // if (adIndex >= adsList.length) adIndex = 0; 
            }
        });

        // If very few stories, maybe append an ad at the end
        if (stories.value.length > 0 && stories.value.length < 5 && adsList.length > 0 && result.length === stories.value.length) {
            result.push(adsList[0]);
        }

        return result;
    });

    return {
        stories,
        myStories,
        isLoading,
        createStory,
        createTextStory,
        createAudioStory,
        uploadStory,
        batchUploadStories,
        fetchStories,
        fetchUserStories,
        deleteExpiredStories,
        deleteStory,
        adminDeleteStory,
        likeStory,
        unlikeStory,
        markAsViewed,
        addComment,
        reactToComment,
        getStoriesByUser,
        initStoriesListener,
        hasLiked,
        hasMore,
        getTimeRemaining,
        reportStory,
        integratedStories
    };
}
