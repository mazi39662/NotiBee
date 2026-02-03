<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Nectar</ion-title>
        <div slot="end" class="header-honey-jar" @click="showJarDetails">
          <div class="jar-icon-wrapper">
             <span class="jar-emoji">🏺</span>
             <div class="jar-level" :style="{ height: `${jarProgress}%` }"></div>
          </div>
          <span class="jar-count">{{ honeyJars }}</span>
        </div>
        <ion-buttons slot="end">
          <ion-button @click="showCreateOptions = true">
            <ion-icon :icon="addCircleOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="nectar-content" :scroll-y="!isCommentsOpen">
      <div class="nectar-bg-overlay"></div>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content
          :pulling-icon="chevronDownCircleOutline"
          pulling-text="Pull to refresh"
          refreshing-spinner="crescent"
          refreshing-text="Refreshing...">
        </ion-refresher-content>
      </ion-refresher>
      
      <div class="days-container">
        <!-- What's on your mind? component -->
        <div class="mind-box glass-panel animate-in">
          <div class="mind-actions">
            <div class="mind-action" @click="showTextModal = true">
              <ion-icon :icon="createOutline" color="primary"></ion-icon>
            </div>
            <div class="mind-action" @click="handleCreateStory">
              <ion-icon :icon="cameraOutline" color="secondary"></ion-icon>
            </div>
            <div class="mind-action" @click="handleUploadWithPreview">
              <ion-icon :icon="imagesOutline" color="primary"></ion-icon>
            </div>
            <div class="mind-action" @click="showCreateOptions = true">
              <ion-icon :icon="addCircleOutline" color="primary"></ion-icon>
            </div>
          </div>
        </div>


        <!-- Nectar Feed Section -->
        <div class="nectar-feed-section">
          <div v-if="stories.length === 0 && !isLoading" class="empty-state">
            <div class="empty-icon">🌸</div>
            <h4>No Nectar Yet</h4>
            <p>Your colony hasn't shared any nectar yet.</p>
          </div>
          
          <div v-else class="cards-container">
            <div 
              v-for="story in integratedStories" 
              :key="story.id" 
              class="nectar-card animate-pop"
              :class="{ 'ad-card': 'isAd' in story }"
              @click="handleItemClick(story)"
            >
              <!-- Card Header -->
              <div class="card-header">
                <div class="card-user" @click.stop="goToProfile(story.beeId)">
                  <div class="card-avatar">{{ 'isAd' in story ? '📣' : '🐝' }}</div>
                  <div class="card-user-info">
                    <h4>{{ 'isAd' in story ? story.beeId : (story.beeId === userBeeId ? 'You' : story.beeId) }}</h4>
                    <span class="card-time" v-if="!('isAd' in story)">{{ getRelativeTime(story.createdAt) }}</span>
                    <span class="sponsored-label" v-else>Sponsored • ✨</span>
                  </div>
                </div>
                <div class="card-drops" :title="`${calculateDrops(story)} Honey Drops Collected` ">
                  <span class="drops-icon">🍯</span>
                  <span class="drops-count">{{ calculateDrops(story) }}</span>
                </div>
              </div>

              <!-- Card Content -->
              <div class="card-content-area">
                <!-- Carousel Image Story -->
                <div v-if="story.imageUrls && story.imageUrls.length > 0" class="card-carousel-wrapper">
                  <div class="carousel-container" @scroll="updateCarouselIndex(story.id, $event)">
                    <div 
                      v-for="(img, idx) in story.imageUrls" 
                      :key="idx" 
                      class="carousel-item"
                    >
                      <img :src="img" alt="Nectar" loading="lazy" />
                    </div>
                  </div>
                  <div class="carousel-dots" v-if="story.imageUrls.length > 1">
                    <div 
                      v-for="(_, idx) in story.imageUrls" 
                      :key="idx" 
                      class="dot"
                      :class="{ 'active': (storyCarouselIndices[story.id] || 0) === idx }"
                    ></div>
                  </div>
                  <div v-if="story.caption" class="card-caption">
                    {{ story.caption }}
                  </div>
                </div>

                <!-- Single Image Story -->
                <div v-else-if="story.imageUrl" class="card-image-wrapper">
                  <img :src="story.imageUrl" alt="Nectar" loading="lazy" />
                  <div v-if="story.caption" class="card-caption">
                    {{ story.caption }}
                  </div>
                </div>
                
                <!-- Text Story -->
                <div v-else class="card-text-story" :style="{ backgroundColor: story.backgroundColor || '#ffbf00' }">
                  <p>{{ story.textContent }}</p>
                </div>
              </div>

              <!-- Card Actions -->
              <div class="card-actions">
                <div class="action-group">
                  <ion-button 
                    fill="clear" 
                    size="small"
                    :color="hasLiked(story.id) ? 'danger' : 'medium'"
                    @click.stop="toggleLikeOnCard(story)"
                    class="card-action-btn"
                  >
                    <ion-icon :icon="hasLiked(story.id) ? heart : heartOutline" slot="start"></ion-icon>
                    {{ story.likes.length }}
                  </ion-button>
                  
                  <ion-button 
                    fill="clear" 
                    size="small"
                    color="medium"
                    @click.stop="openCommentsOnCard(story)"
                    class="card-action-btn"
                  >
                    <ion-icon :icon="chatbubbleOutline" slot="start"></ion-icon>
                    {{ ('isAd' in story) ? '0' : (story.comments?.length || 0) }}
                  </ion-button>
                </div>

                <div class="action-group" v-if="'isAd' in story">
                  <ion-button 
                    fill="solid" 
                    size="small" 
                    color="primary" 
                    class="cta-btn"
                    @click.stop="handleAdCTA(story)"
                  >
                    {{ (story as any).ctaLabel || 'Learn More' }}
                    <ion-icon :icon="flash" slot="end"></ion-icon>
                  </ion-button>
                </div>

                <div class="action-group" v-else>
                  <ion-button 
                    v-if="story.beeId !== userBeeId"
                    fill="clear" 
                    size="small"
                    color="medium"
                    @click.stop="handleReport(story)"
                    class="card-action-btn report-btn"
                  >
                    <ion-icon :icon="alertCircleOutline" slot="icon-only"></ion-icon>
                  </ion-button>

                  <ion-button 
                    v-if="story.beeId === userBeeId"
                    fill="clear" 
                    size="small"
                    color="medium"
                    @click.stop="isViewsModalOpen = true; currentStory = story"
                    class="card-action-btn"
                  >
                    <ion-icon :icon="eyeOutline" slot="start"></ion-icon>
                    {{ story.views.length }}
                  </ion-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Story Viewer Modal -->
      <ion-modal 
        :is-open="isViewerOpen" 
        @didDismiss="closeStoryViewer"
        class="story-viewer-modal"
      >
        <div class="story-viewer" v-if="currentStory">
          <!-- Progress bars -->
          <div class="progress-bars">
            <div 
              v-for="(story, index) in currentStoryGroup" 
              :key="story.id"
              class="progress-bar"
            >
              <div 
                class="progress-fill" 
                :class="{ 
                  'complete': index < currentStoryIndex,
                  'active': index === currentStoryIndex 
                }"
              ></div>
            </div>
          </div>

          <!-- Story Header -->
          <div class="story-header">
            <div class="story-user" @click="goToProfile(currentStory.beeId)">
              <div class="user-avatar">🐝</div>
              <div class="user-details">
                <h4>{{ currentStory.beeId }}</h4>
                <p>{{ getRelativeTime(currentStory.createdAt) }}</p>
              </div>
            </div>
            <div class="story-header-actions">
              <ion-button v-if="currentStory.beeId !== userBeeId" fill="clear" color="light" @click="handleReport(currentStory)">
                <ion-icon :icon="alertCircleOutline" slot="icon-only"></ion-icon>
              </ion-button>
              <ion-button fill="clear" color="light" @click="closeStoryViewer">
                <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </div>

          <!-- Story Content -->
          <div class="story-content" @click="handleStoryContentClick($event)">
            <!-- Carousel Images -->
            <template v-if="currentStory.imageUrls && currentStory.imageUrls.length > 0">
              <img :src="currentStory.imageUrls[viewerImageIndex]" alt="Story" />
              <!-- Small dots for viewer carousel if needed -->
              <div class="viewer-dots" v-if="currentStory.imageUrls.length > 1">
                <div v-for="(_, idx) in currentStory.imageUrls" :key="idx" 
                     class="dot" :class="{ 'active': viewerImageIndex === idx }"></div>
              </div>
            </template>

            <!-- Single Image Post -->
            <img v-else-if="currentStory.imageUrl" :src="currentStory.imageUrl" alt="Story" />
            
            <!-- Text Post -->
            <div v-else class="text-story" :style="{ backgroundColor: currentStory.backgroundColor || '#ffbf00' }">
              <div class="text-story-content">
                <p>{{ currentStory.textContent }}</p>
              </div>
            </div>
            
            <div v-if="currentStory.caption" class="story-caption">
              {{ currentStory.caption }}
            </div>
          </div>

          <!-- Story Actions -->
          <div class="story-actions">
            <div class="like-section">
              <ion-button 
                fill="clear" 
                size="large"
                :color="hasLiked(currentStory.id) ? 'danger' : 'light'"
                @click="toggleLike"
                class="heart-btn"
              >
                <ion-icon 
                  :icon="hasLiked(currentStory.id) ? heart : heartOutline" 
                  slot="icon-only"
                  class="heart-icon"
                  :class="{ 'liked': hasLiked(currentStory.id) }"
                ></ion-icon>
              </ion-button>
              <span class="action-count" v-if="currentStory.likes.length > 0">
                {{ currentStory.likes.length }} Likes
              </span>
            </div>

            <div class="comment-section">
              <ion-button 
                fill="clear" 
                size="large"
                color="light"
                @click="isCommentsOpen = true"
                class="comment-btn"
              >
                <ion-icon :icon="chatbubbleOutline" slot="icon-only" class="comment-icon"></ion-icon>
              </ion-button>
              <span class="action-count" v-if="currentStory.comments && currentStory.comments.length > 0">
                {{ currentStory.comments.length }}
              </span>
            </div>

            <div class="owner-controls" v-if="currentStory.beeId === userBeeId">
               <div class="view-item" @click="isViewsModalOpen = true">
                 <ion-icon :icon="eyeOutline"></ion-icon>
                 <span>{{ currentStory.views.length }}</span>
               </div>
               <ion-button 
                 fill="clear" 
                 color="danger" 
                 @click="confirmDelete(currentStory.id)"
               >
                  <ion-icon :icon="trashOutline" slot="icon-only"></ion-icon>
               </ion-button>
            </div>
          </div>

          <!-- Navigation -->
          <div class="story-nav">
            <div class="nav-area nav-prev" @click="prevStory"></div>
            <div class="nav-area nav-next" @click="nextStory"></div>
          </div>
        </div>
      </ion-modal>

      <!-- Create Story Options -->
      <ion-action-sheet
        :is-open="showCreateOptions"
        header="Share Nectar"
        :buttons="createActionButtons"
        @didDismiss="showCreateOptions = false"
      ></ion-action-sheet>

      <!-- Text Story Modal -->
      <ion-modal
        :is-open="showTextModal"
        @didDismiss="showTextModal = false"
        class="text-modal"
      >
        <div class="modal-wrapper">
          <div class="modal-header">
            <h2>Share Your Thoughts</h2>
            <ion-button fill="clear" @click="showTextModal = false">
              <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
          
          <div class="text-input-container" :style="{ backgroundColor: selectedColor }">
            <ion-textarea
              v-model="textContent"
              placeholder="What's on your mind?"
              :auto-grow="true"
              :rows="6"
              class="text-story-input"
            ></ion-textarea>
          </div>

          <div class="color-picker">
            <div class="color-label">Background Color:</div>
            <div class="color-options">
              <div
                v-for="color in backgroundColors"
                :key="color"
                class="color-option"
                :class="{ 'selected': selectedColor === color }"
                :style="{ backgroundColor: color }"
                @click="selectedColor = color"
              ></div>
            </div>
          </div>

          <ion-button
            expand="block"
            color="primary"
            @click="handleCreateTextStory"
            :disabled="!textContent.trim()"
          >
            Share Nectar 🌸
          </ion-button>
        </div>
      </ion-modal>

      <!-- Image Preview Modal -->
      <ion-modal
        :is-open="showImagePreview"
        @didDismiss="cancelImageUpload"
        class="preview-modal"
      >
        <div class="modal-wrapper preview-wrapper">
          <div class="modal-header">
            <h2>Preview</h2>
            <ion-button fill="clear" @click="cancelImageUpload">
              <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>

          <div class="preview-image-container">
            <img v-if="previewImageUrl" :src="previewImageUrl" alt="Preview" />
          </div>

          <div class="caption-input-area glass-panel">
            <ion-textarea
              v-model="uploadCaption"
              placeholder="Add a sweet caption..."
              :auto-grow="true"
              :rows="2"
              class="caption-input"
            ></ion-textarea>
          </div>

          <div class="preview-actions">
            <ion-button expand="block" fill="outline" color="medium" @click="cancelImageUpload">
              Cancel
            </ion-button>
            <ion-button expand="block" color="primary" @click="confirmImageUpload">
              Share Nectar 🌸
            </ion-button>
          </div>
        </div>
      </ion-modal>

      <!-- Batch Image Preview Modal -->
      <ion-modal
        :is-open="showBatchPreview"
        @didDismiss="cancelBatchUpload"
        class="preview-modal batch-modal"
      >
        <div class="modal-wrapper preview-wrapper">
          <div class="modal-header">
            <h2>Batch Share ({{ pendingBatchImages.length }})</h2>
            <ion-button fill="clear" @click="cancelBatchUpload">
              <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>

          <div class="batch-scroll-container">
            <div 
              v-for="(img, idx) in pendingBatchImages" 
              :key="idx" 
              class="batch-preview-item"
            >
              <div class="batch-img-wrapper">
                <img :src="img" alt="Batch Preview" />
                <button class="remove-batch-btn" @click="removeBatchItem(idx)">
                   <ion-icon :icon="closeOutline"></ion-icon>
                </button>
              </div>
            </div>
          </div>

          <div class="caption-input-area glass-panel">
            <ion-textarea
              v-model="uploadCaption"
              placeholder="Add a caption for all..."
              :auto-grow="true"
              :rows="2"
              class="caption-input"
            ></ion-textarea>
          </div>

          <div class="preview-actions">
            <ion-button expand="block" fill="outline" color="medium" @click="cancelBatchUpload">
              Cancel
            </ion-button>
            <ion-button expand="block" color="primary" @click="confirmBatchUpload">
              Share All 🌸
            </ion-button>
          </div>
        </div>
      </ion-modal>
      <ion-infinite-scroll 
        @ionInfinite="handleLoadMore($event)" 
        :disabled="!hasMore"
      >
        <ion-infinite-scroll-content
          loading-spinner="bubbles"
          loading-text="Buzzing for more..."
        ></ion-infinite-scroll-content>
      </ion-infinite-scroll>
      
      <HiveSplash :show="isLoading" status-text="Gathering Nectar..." />

      <!-- Comments Drawer -->
      <ion-modal
        ref="commentsModal"
        :is-open="isCommentsOpen"
        @didDismiss="isCommentsOpen = false"
        :initial-breakpoint="1"
        :breakpoints="[0, 1]"
        class="comments-modal"
      >
        <ion-header class="ion-no-border">
          <ion-toolbar class="modal-toolbar">
            <ion-title>Comments</ion-title>
            <ion-buttons slot="end">
              <ion-button color="medium" @click="isCommentsOpen = false">
                <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="comments-content" ref="commentsListRef">
          <div class="comments-list">
            <div v-if="!currentStory?.comments || currentStory?.comments?.length === 0" class="no-comments">
              <p>No nectar comments yet. Be the first!</p>
            </div>
            <div v-for="comment in currentStory?.comments" :key="comment.id" class="comment-item">
              <div class="comment-avatar">🐝</div>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-bee-id" @click="goToProfile(comment.beeId)">{{ comment.beeId }}</span>
                  <span class="comment-time">{{ getRelativeTime(comment.createdAt) }}</span>
                </div>
                <p class="comment-text">{{ comment.text }}</p>
                
                <!-- Comment Reactions -->
                <div class="comment-footer">
                  <div class="comment-reactions" v-if="comment.reactions && Object.keys(comment.reactions).length > 0">
                    <div 
                      v-for="(users, emoji) in comment.reactions" 
                      :key="emoji"
                      v-show="users.length > 0"
                      class="reaction-pill"
                      :class="{ 'reacted': users.includes(userBeeId || '') }"
                      @click="handleCommentReaction(comment.id, emoji)"
                    >
                      <span class="emoji">{{ emoji }}</span>
                      <span class="count">{{ users.length }}</span>
                    </div>
                  </div>
                  
                  <div class="comment-status-row">
                    <ion-button 
                      fill="clear" 
                      size="small" 
                      color="medium" 
                      class="comment-react-btn"
                      @click="showEmojiPickerForComment($event, comment.id)"
                    >
                      <ion-icon :icon="happyOutline" slot="icon-only"></ion-icon>
                    </ion-button>

                    <div class="message-status-indicator" v-if="comment.beeId === userBeeId">
                      <ion-spinner name="crescent" v-if="comment.status === 'sending'"></ion-spinner>
                      <ion-icon :icon="checkmarkDoneOutline" class="sent-icon" v-else-if="comment.status === 'sent' || !comment.status"></ion-icon>
                      <ion-icon :icon="alertCircleOutline" class="error-icon" v-else-if="comment.status === 'error'"></ion-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ion-content>

        <ion-footer class="ion-no-border comments-footer">
          <div class="chat-input-area glass-panel gold-glow-mini">
            <ion-textarea
              ref="commentInputRef"
              v-model="newComment"
              placeholder="Write a sweet comment..."
              :auto-grow="true"
              :rows="1"
              class="chat-textarea"
              @keyup.enter="handleCommentAdd"
            ></ion-textarea>
            <button 
              @click="handleCommentAdd" 
              :disabled="!newComment.trim() || isSendingComment"
              class="chat-send-btn"
              :class="{ 'is-sending': isSendingComment }"
            >
              <ion-spinner v-if="isSendingComment" name="crescent" size="small"></ion-spinner>
              <ion-icon v-else :icon="flash"></ion-icon>
            </button>
          </div>
        </ion-footer>
      </ion-modal>


      <!-- Views List Modal -->
      <ion-modal
        :is-open="isViewsModalOpen"
        @didDismiss="isViewsModalOpen = false; showAllStoryViews = false"
        :initial-breakpoint="0.5"
        :breakpoints="[0, 0.5, 0.8]"
        class="views-modal"
      >
        <div class="views-container">
          <ion-header class="ion-no-border">
            <ion-toolbar class="modal-toolbar">
              <ion-title>Seen by</ion-title>
              <ion-buttons slot="end">
                <ion-button color="medium" @click="isViewsModalOpen = false">
                  <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content>
            <div class="views-list">
              <div v-if="!currentStory?.views || currentStory?.views?.length === 0" class="no-views">
                <p>No bees have seen this nectar yet.</p>
              </div>
              <div 
                v-for="viewerId in displayedStoryViews" 
                :key="viewerId" 
                class="viewer-item"
                :class="{ 'is-blurred': !isActuallyFriend(viewerId) && !revealedViewers.has(viewerId) }"
              >
                <div class="viewer-avatar">🐝</div>
                <div class="viewer-info">
                  <template v-if="isActuallyFriend(viewerId) || revealedViewers.has(viewerId)">
                    <span class="viewer-bee-id" @click="goToProfile(viewerId)">{{ viewerId }}</span>
                  </template>
                  <template v-else>
                    <span class="viewer-bee-id blurred-text">Unknown Bee</span>
                  </template>
                </div>
                
                <div class="viewer-action" v-if="!isActuallyFriend(viewerId) && !revealedViewers.has(viewerId)">
                   <ion-button fill="clear" size="small" @click="handleRevealViewer(viewerId)">
                     <ion-icon :icon="honeyJarIcon" slot="start"></ion-icon>
                     Reveal (1 Jar)
                   </ion-button>
                </div>
              </div>
              
              <div v-if="currentStory?.views && currentStory.views.length > 10 && !showAllStoryViews" class="view-more-container" @click="showAllStoryViews = true">
                <ion-button fill="clear" expand="block">
                  View {{ currentStory.views.length - 10 }} more
                </ion-button>
              </div>
            </div>
          </ion-content>
        </div>
      </ion-modal>

      <!-- Emoji Picker Popover -->
      <ion-popover 
        :is-open="isEmojiPickerOpen" 
        :event="emojiPickerEvent"
        @didDismiss="isEmojiPickerOpen = false"
        class="emoji-picker-popover"
      >
        <div class="emoji-picker-content">
          <div 
            v-for="emoji in commonEmojis" 
            :key="emoji" 
            class="emoji-option"
            @click="handleEmojiSelect(emoji)"
          >
            {{ emoji }}
          </div>
        </div>
      </ion-popover>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonModal, IonTextarea,
  IonSpinner, IonActionSheet, IonRefresher, IonRefresherContent,
  IonInfiniteScroll, IonInfiniteScrollContent, IonFooter,
  alertController, toastController
} from '@ionic/vue';
import {
  addCircleOutline, heartOutline, heart, eyeOutline,
  trashOutline, closeOutline, cameraOutline, imagesOutline,
  createOutline, chevronDownCircleOutline, chatbubbleOutline,
  paperPlaneOutline, leafOutline, leaf, eyeOutline as eye,
  informationCircleOutline, happyOutline, flash, alertCircleOutline, checkmarkDoneOutline
} from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { IonPopover } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useMyDaysService, Story } from '@/services/MyDaysService';
import { useAdService } from '@/services/AdService';
import { useHoneyService } from '@/services/HoneyService';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useUserService } from '@/services/UserService';
import { useRouter } from 'vue-router';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

const commentsModal = ref<any>(null);
const commentsListRef = ref<HTMLElement | null>(null);
const keyboardOffset = ref(0); // Kept for other potential uses if any, but removing listeners below

const { 
  honeyDrops, 
  honeyJars, 
  jarProgress, 
  consumeJar,
  isRevealed
} = useHoneyService();
const honeyJarIcon = '🏺';

const { userBeeId, getFriends } = useUserService();
const friends = getFriends();
const revealedViewers = ref(new Set<string>());

const isActuallyFriend = (id: string) => {
  return friends.value.includes(id) || id === userBeeId.value || isRevealed(id);
};

const handleRevealViewer = async (id: string) => {
  if (honeyJars.value <= 0) {
    const toast = await toastController.create({
      message: 'You need 1 full Honey Jar to reveal Unknown Bees! 🍯',
      duration: 3000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
    return;
  }

  const success = await consumeJar(id);
  if (success) {
    Haptics.notification({ type: ImpactStyle.Heavy as any });
    
    const toast = await toastController.create({
      message: 'Unknown Bee revealed! 🏺✨',
      duration: 2000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }
};

const showJarDetails = async () => {
    const alert = await alertController.create({
        header: 'Honey Harvest 🍯',
        message: `You have ${honeyDrops.value}/30 drops to fill your next jar. You have ${honeyJars.value} full jars ready! \n\nInteract with nectar to gather more drops!`,
        buttons: [
          {
            text: 'Watch Ad for +1 Jar 🏺',
            handler: () => {
              handleGetFreeJar();
            }
          },
          { text: 'OK' }
        ]
    });
    await alert.present();
};

const handleGetFreeJar = () => {
  showRewarded(async () => {
     const { addHoneyJar } = useHoneyService();
     await addHoneyJar(1);
     
     const toast = await toastController.create({
       message: 'Rewarded! You earned 1 Honey Jar! 🏺✨',
       duration: 3000,
       color: 'warning'
     });
     await toast.present();
  });
};

const {
  stories,
  myStories,
  isLoading,
  createStory,
  createTextStory,
  uploadStory,
  batchUploadStories,
  fetchStories,
  deleteExpiredStories,
  deleteStory,
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
} = useMyDaysService();

const { 
  trackAdClick, 
  trackAdView, 
  fetchAds, 
  initializeAdMob, 
  showInterstitial,
  showRewarded
} = useAdService();

const handleItemClick = (item: any) => {
  if (item.isAd) {
    trackAdClick(item.id);
    if (item.ctaUrl) {
      window.open(item.ctaUrl, '_blank');
    }
  } else {
    openStoryViewer(item, [item]);
  }
};

const handleAdCTA = (ad: any) => {
  trackAdClick(ad.id);
  if (ad.ctaUrl) {
    window.open(ad.ctaUrl, '_blank');
  }
};

const calculateDrops = (story: Story) => {
  const views = story.views?.length || 0;
  const likes = story.likes?.length || 0;
  const comments = story.comments?.length || 0;
  return views + (likes * 2) + (comments * 3);
};

const toggleLikeOnCard = async (story: Story) => {
  try {
    if (hasLiked(story.id)) {
      await unlikeStory(story.id);
    } else {
      await likeStory(story.id);
    }
    Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('Error toggling like on card:', error);
  }
};

const openCommentsOnCard = (story: Story) => {
  currentStory.value = story;
  isCommentsOpen.value = true;
};

const showCreateOptions = ref(false);
const showTextModal = ref(false);
const showImagePreview = ref(false);
const showBatchPreview = ref(false);
const isViewerOpen = ref(false);
const uploadCaption = ref('');
const viewerImageIndex = ref(0);
const storyCarouselIndices = ref<Record<string, number>>({});
const currentStory = ref<Story | null>(null);
const currentStoryGroup = ref<Story[]>([]);
const currentStoryIndex = ref(0);
const router = useRouter();

const isCommentsOpen = ref(false);
const isSendingComment = ref(false);
const newComment = ref('');
const isViewsModalOpen = ref(false);
const currentCommentId = ref<string | null>(null);
const isEmojiPickerOpen = ref(false);
const emojiPickerEvent = ref<any>(null);
const commonEmojis = ['❤️', '😂', '😮', '😢', '🔥', '🐝', '👍', '🙏'];

const handleReport = async (story: Story) => {
  const alert = await alertController.create({
    header: 'Report Nectar',
    message: 'Why are you reporting this nectar?',
    inputs: [
      { name: 'reason', type: 'radio', label: 'Bullying', value: 'Bullying', checked: true },
      { name: 'reason', type: 'radio', label: 'Inappropriate Content', value: 'Inappropriate Content' },
      { name: 'reason', type: 'radio', label: 'Spam', value: 'Spam' },
      { name: 'reason', type: 'radio', label: 'Violence', value: 'Violence' },
      { name: 'reason', type: 'radio', label: 'Harassment', value: 'Harassment' },
      { name: 'reason', type: 'radio', label: 'Other', value: 'Other' }
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Report',
        handler: async (data) => {
          try {
            await reportStory(story.id, data);
            const toast = await toastController.create({
              message: 'Thank you for reporting. Our colony will review this! 🐝',
              duration: 3000,
              color: 'warning',
              position: 'top'
            });
            await toast.present();
            if (isViewerOpen.value) closeStoryViewer();
          } catch (error) {
            console.error('Report failed:', error);
          }
        }
      }
    ]
  });
  await alert.present();
};

const showEmojiPickerForComment = (event: any, commentId: string) => {
  currentCommentId.value = commentId;
  emojiPickerEvent.value = event;
  isEmojiPickerOpen.value = true;
};

const handleEmojiSelect = async (emoji: string) => {
  if (!currentStory.value || !currentCommentId.value) return;
  
  try {
    await reactToComment(currentStory.value.id, currentCommentId.value, emoji);
    isEmojiPickerOpen.value = false;
    currentCommentId.value = null;
    Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('Error reacting to comment:', error);
  }
};

const handleCommentReaction = async (commentId: string, emoji: string) => {
  if (!currentStory.value) return;
  try {
    await reactToComment(currentStory.value.id, commentId, emoji);
    Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('Error handling comment reaction:', error);
  }
};

const showAllStoryViews = ref(false);
const commentInputRef = ref<any>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (commentsListRef.value) {
    // Scroll the ion-content
    const content = commentsListRef.value as any;
    if (content.scrollToBottom) {
      content.scrollToBottom(300);
    } else {
      commentsListRef.value.scrollTop = commentsListRef.value.scrollHeight;
    }
  }
};

const focusCommentInput = () => {
  setTimeout(() => {
    commentInputRef.value?.$el.querySelector('textarea')?.focus();
  }, 400);
};

// Watch for comments changes to scroll
watch(() => currentStory.value?.comments?.length, () => {
  if (isCommentsOpen.value) {
    scrollToBottom();
  }
});

// Watch for modal opening
watch(isCommentsOpen, (isOpen) => {
  if (isOpen) {
    scrollToBottom();
  }
});

// Text story creation
const textContent = ref('');
const selectedColor = ref('#ffbf00');
const backgroundColors = ['#ffbf00', '#ff6b00', '#ff1744', '#9c27b0', '#3f51b5', '#00bcd4', '#4caf50', '#ffeb3b'];

const displayedStoryViews = computed(() => {
  if (!currentStory.value) return [];
  if (showAllStoryViews.value) return currentStory.value.views;
  return currentStory.value.views.slice(0, 10);
});

// Image preview
const previewImageUrl = ref<string | null>(null);
const pendingImageData = ref<string | null>(null);

let cleanupInterval: number | null = null;

import HiveSplash from '@/components/HiveSplash.vue';

// ... (existing refs)

const slideIndices = ref<Record<string, number>>({});
let slideInterval: number | null = null;
let unsubscribeStories: (() => void) | null = null;

onMounted(async () => {
  await fetchStories();
  await deleteExpiredStories();
  
  // Real Ads Initialization
  initializeAdMob();
  await fetchAds();
  
  // Real-time listener
  unsubscribeStories = initStoriesListener();
  
  // Auto-run cleanup every minute
  cleanupInterval = window.setInterval(() => {
    deleteExpiredStories();
  }, 60000);

  // Slideshow interval
  slideInterval = window.setInterval(() => {
    friendsStories.value.forEach(([beeId, stories]) => {
      if (stories.length > 1) {
        const current = slideIndices.value[beeId] || 0;
        slideIndices.value[beeId] = (current + 1) % stories.length;
      }
    });
  }, 3000);

  // Keyboard Listeners
  if (Capacitor.isNativePlatform()) {
    Keyboard.addListener('keyboardWillShow', (info) => {
      // Auto-expand modal to full screen if it's the comments modal
      if (isCommentsOpen.value && commentsModal.value) {
        commentsModal.value.$el.setCurrentBreakpoint(1);
      }
      // Also scroll list to bottom after expansion
      setTimeout(scrollToBottom, 300);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      keyboardOffset.value = 0;
    });
  }
});

onUnmounted(() => {
  if (cleanupInterval) clearInterval(cleanupInterval);
  if (slideInterval) clearInterval(slideInterval);
  if (unsubscribeStories) unsubscribeStories();
  if (Capacitor.isNativePlatform()) {
    Keyboard.removeAllListeners();
  }
});

const handleRefresh = async (event: CustomEvent) => {
  await Promise.all([
    fetchStories(),
    fetchAds(),
    deleteExpiredStories()
  ]);
  (event.target as any)?.complete();
};

const friendsStories = computed(() => {
  const grouped = getStoriesByUser.value;
  const result: [string, Story[]][] = [];
  
  // Sort Logic: 
  // 1. My Post (if exists)
  // 2. Others (Latest Posted first)
  
  const myStoriesGroup: [string, Story[]][] = [];
  const otherStoriesGroup: [string, Story[]][] = [];
  
  grouped.forEach((userStories, beeId) => {
    // Basic Sort for stories inside the group (Newest First)
    userStories.sort((a, b) => b.createdAt - a.createdAt);
    
    if (beeId === userBeeId.value) {
      myStoriesGroup.push([beeId, userStories]);
    } else {
      otherStoriesGroup.push([beeId, userStories]);
    }
  });

  // Sort others by their LATEST story timestamp
  otherStoriesGroup.sort((a, b) => {
    const aLatest = a[1].length > 0 ? a[1][0].createdAt : 0;
    const bLatest = b[1].length > 0 ? b[1][0].createdAt : 0;
    return bLatest - aLatest;
  });
  
  // Combine: Mine First, then Others
  return [...myStoriesGroup, ...otherStoriesGroup];
});

const handleLoadMore = async (ev: CustomEvent) => {
  await fetchStories(true); // Load More
  ev.detail.complete();
};

const hasViewedAll = (userStories: Story[]): boolean => {
  const currentUserBeeId = localStorage.getItem('bee_id');
  if (!currentUserBeeId) return true;
  return userStories.every(story => story.views.includes(currentUserBeeId));
};

const openStoryViewer = (story: Story, group?: Story[]) => {
  currentStory.value = story;
  currentStoryGroup.value = group || [story];
  currentStoryIndex.value = 0;
  viewerImageIndex.value = 0;
  isViewerOpen.value = true;
  
  // Mark as viewed
  markAsViewed(story.id);
};

const closeStoryViewer = () => {
  isViewerOpen.value = false;
  currentStory.value = null;
  currentStoryGroup.value = [];
  currentStoryIndex.value = 0;
  viewerImageIndex.value = 0;
};

const nextStory = () => {
  // If current story has multiple images, go to next image first
  if (currentStory.value?.imageUrls && currentStory.value.imageUrls.length > 0) {
    if (viewerImageIndex.value < currentStory.value.imageUrls.length - 1) {
      viewerImageIndex.value++;
      return;
    }
  }

  // Otherwise go to next story in group
  if (currentStoryIndex.value < currentStoryGroup.value.length - 1) {
    currentStoryIndex.value++;
    currentStory.value = currentStoryGroup.value[currentStoryIndex.value];
    viewerImageIndex.value = 0;
    markAsViewed(currentStory.value.id);
  } else {
    closeStoryViewer();
  }
};

const prevStory = () => {
  // If current story has multiple images, go to prev image first
  if (currentStory.value?.imageUrls && currentStory.value.imageUrls.length > 0) {
    if (viewerImageIndex.value > 0) {
      viewerImageIndex.value--;
      return;
    }
  }

  // Otherwise go to prev story in group
  if (currentStoryIndex.value > 0) {
    currentStoryIndex.value--;
    currentStory.value = currentStoryGroup.value[currentStoryIndex.value];
    // Set to last image of prev story if it's a carousel
    if (currentStory.value.imageUrls && currentStory.value.imageUrls.length > 0) {
      viewerImageIndex.value = currentStory.value.imageUrls.length - 1;
    } else {
      viewerImageIndex.value = 0;
    }
  }
};

const handleStoryContentClick = (event: MouseEvent) => {
  const width = window.innerWidth;
  if (event.clientX < width / 3) {
    prevStory();
  } else {
    nextStory();
  }
};

const updateCarouselIndex = (storyId: string, event: any) => {
  const container = event.target;
  const index = Math.round(container.scrollLeft / container.clientWidth);
  storyCarouselIndices.value[storyId] = index;
};

const goToProfile = (beeId: string) => {
  closeStoryViewer();
  router.push(`/tabs/profile/${beeId}`);
};

const handleCommentAdd = async () => {
  if (!currentStory.value || !newComment.value.trim()) return;
  
  const commentText = newComment.value.trim();
  
  // Optimistic update for immediate feedback
  if (!currentStory.value.comments) {
    currentStory.value.comments = [];
  }

  const temporaryId = 'temp-' + Date.now();
  const tempComment = {
    id: temporaryId,
    beeId: userBeeId.value || 'You',
    text: commentText,
    createdAt: Date.now(),
    reactions: {},
    status: 'sending'
  };

  // Add to local state for immediate reflection
  currentStory.value.comments.push(tempComment as any);
  newComment.value = ''; // Clear input immediately
  
  // Refocus input to keep keyboard open
  focusCommentInput();

  try {
    await addComment(currentStory.value.id, commentText);
    
    // Update optimistic comment to "sent" status
    const comm = currentStory.value.comments.find(c => c.id === temporaryId);
    if (comm) {
      comm.status = 'sent';
    }
    
    Haptics.impact({ style: ImpactStyle.Light });
    scrollToBottom();
  } catch (error) {
    // Show error state on the optimistic comment
    const comm = currentStory.value.comments.find(c => c.id === temporaryId);
    if (comm) {
      comm.status = 'error';
    }
    console.error('Error adding comment:', error);
  }
};

const toggleLike = async () => {
  if (!currentStory.value) return;
  
  try {
    if (hasLiked(currentStory.value.id)) {
      await unlikeStory(currentStory.value.id);
    } else {
      await likeStory(currentStory.value.id);
    }
  } catch (error) {
    console.error('Error toggling like:', error);
  }
};

const confirmDelete = async (storyId: string) => {
  const alert = await alertController.create({
    header: 'Delete Nectar?',
    message: 'This nectar will be permanently deleted.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteStory(storyId);
            const toast = await toastController.create({
              message: 'Nectar deleted',
              duration: 2000,
              color: 'warning'
            });
            await toast.present();
          } catch (error) {
            console.error('Error deleting story:', error);
          }
        }
      }
    ]
  });
  await alert.present();
};

const handleCreateStory = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      width: 1080,
      height: 1920,
      correctOrientation: true
    });

    if (image.dataUrl) {
      uploadCaption.value = '';
      previewImageUrl.value = image.dataUrl;
      pendingImageData.value = image.dataUrl;
      showImagePreview.value = true;
    }
  } catch (error: any) {
    if (error.message !== 'User cancelled photos app') {
      console.error('Error capturing photo:', error);
    }
  }
};

const handleUploadStory = async () => {
  try {
    await uploadStory();
    const toast = await toastController.create({
      message: 'Nectar shared! 🌸',
      duration: 2000,
      color: 'warning'
    });
    await toast.present();
  } catch (error: any) {
    if (error.message !== 'User cancelled photos app') {
      const toast = await toastController.create({
        message: 'Failed to share nectar',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }
};

// Text story handlers
const handleCreateTextStory = async () => {
  try {
    await createTextStory(textContent.value, selectedColor.value);
    showTextModal.value = false;
    textContent.value = '';
    selectedColor.value = '#ffbf00';
    
    const toast = await toastController.create({
      message: 'Nectar shared! 🌸',
      duration: 2000,
      color: 'warning'
    });
    await toast.present();

    // Show Interstitial Ad after posting (monetization)
    setTimeout(() => {
      showInterstitial();
    }, 1000);

  } catch (error: any) {
    const toast = await toastController.create({
      message: 'Failed to share nectar',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }
};

// Image preview handlers
const handleUploadWithPreview = async () => {
  try {
    // Attempt picking multiple images first
    const { photos } = await Camera.pickImages({
      quality: 80,
      width: 1080,
      height: 1920,
      limit: 10
    });

    if (photos.length > 0) {
      uploadCaption.value = '';
      
      if (photos.length === 1) {
        // Single image
        const photo = photos[0];
        const res = await fetch(photo.webPath);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          previewImageUrl.value = reader.result as string;
          pendingImageData.value = reader.result as string;
          showImagePreview.value = true;
        };
        reader.readAsDataURL(blob);
      } else {
        // Batch upload
        const dataUrls = await Promise.all(photos.map(async (photo) => {
          const res = await fetch(photo.webPath);
          const blob = await res.blob();
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }));
        
        pendingBatchImages.value = dataUrls;
        showBatchPreview.value = true;
      }
    }
  } catch (error: any) {
    if (error.message !== 'User cancelled photos app') {
      console.error('Error selecting images:', error);
    }
  }
};

const confirmImageUpload = async () => {
  if (!pendingImageData.value) return;

  try {
    showImagePreview.value = false;
    await uploadStory(uploadCaption.value, pendingImageData.value || undefined);
    
    const toast = await toastController.create({
      message: 'Nectar shared! 🌸',
      duration: 2000,
      color: 'warning'
    });
    await toast.present();
    
    // Show Interstitial Ad after posting image
    setTimeout(() => {
      showInterstitial();
    }, 1000);

    // Clear preview data
    previewImageUrl.value = null;
    pendingImageData.value = null;
    uploadCaption.value = '';
  } catch (error) {
    const toast = await toastController.create({
      message: 'Failed to share nectar',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }
};

const cancelImageUpload = () => {
  showImagePreview.value = false;
  previewImageUrl.value = null;
  pendingImageData.value = null;
  uploadCaption.value = '';
};

const pendingBatchImages = ref<string[]>([]);

const confirmBatchUpload = async () => {
  if (pendingBatchImages.value.length === 0) return;

  try {
    showBatchPreview.value = false;
    const batchData = pendingBatchImages.value.map(dataUrl => ({
      dataUrl,
      caption: uploadCaption.value
    }));
    
    await batchUploadStories(batchData);
    
    const toast = await toastController.create({
      message: `Batch shared! ${batchData.length} nectar items posted. 🍯`,
      duration: 3000,
      color: 'warning'
    });
    await toast.present();

    // Show Interstitial Ad after batch posting (monetization)
    setTimeout(() => {
      showInterstitial();
    }, 1000);
    
    pendingBatchImages.value = [];
    uploadCaption.value = '';
  } catch (error) {
    const toast = await toastController.create({
      message: 'Batch upload failed',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }
};

const cancelBatchUpload = () => {
  showBatchPreview.value = false;
  pendingBatchImages.value = [];
  uploadCaption.value = '';
};

const removeBatchItem = (index: number) => {
  pendingBatchImages.value.splice(index, 1);
  if (pendingBatchImages.value.length === 0) {
    cancelBatchUpload();
  }
};

const createActionButtons = [
  {
    text: 'Write Text',
    icon: createOutline,
    handler: () => { showTextModal.value = true; }
  },
  {
    text: 'Take Photo',
    icon: cameraOutline,
    handler: handleCreateStory
  },
  {
    text: 'Choose from Gallery',
    icon: imagesOutline,
    handler: handleUploadWithPreview
  },
  {
    text: 'Cancel',
    role: 'cancel'
  }
];

const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return 'Yesterday';
};
</script>

<style scoped>
.header-honey-jar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 191, 0, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255, 191, 0, 0.2);
  margin-right: 8px;
  cursor: pointer;
  flex-shrink: 0;
}

@media (max-width: 360px) {
  .header-honey-jar {
    gap: 4px;
    padding: 3px 8px;
    margin-right: 4px;
  }
}

.jar-icon-wrapper {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.jar-emoji {
  font-size: 18px;
  position: relative;
  z-index: 2;
}

.jar-level {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 191, 0, 0.4);
  z-index: 1;
  transition: height 0.3s ease;
}

.jar-count {
  font-weight: 800;
  font-size: 14px;
  color: var(--ion-color-primary);
}

.nectar-content {
  --background: var(--ion-background-color);
}

.nectar-bg-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(255, 191, 0, 0.12), transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 107, 0, 0.08), transparent 50%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%23ffbf00' stroke-opacity='0.12' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 100% 100%, 100% 100%, 56px 100px;
  background-repeat: no-repeat, no-repeat, repeat;
  pointer-events: none;
  z-index: 0;
  animation: honey-flow 20s infinite linear;
}

@keyframes honey-flow {
  0% { background-position: 0% 0%, 0% 0%, 0 0; }
  100% { background-position: 0% 0%, 0% 0%, 0 100px; }
}

.days-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 0 16px 24px;
  position: relative;
  z-index: 1;
}

@media (max-width: 360px) {
  .days-container {
    padding: 0 12px 16px;
  }
}

h3 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-bottom: 16px;
  font-weight: 700;
}

/* My Stories Grid */
.my-stories-section {
  margin-bottom: 32px;
}

.stories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.story-card {
  position: relative;
  aspect-ratio: 9/16;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.story-card:active {
  transform: scale(0.95);
}

.story-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  position: relative;
}

.story-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 30%, transparent 70%, rgba(0,0,0,0.6));
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
}

.story-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: white;
  font-weight: 600;
}

.story-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.story-stats ion-icon {
  font-size: 14px;
}

.story-time {
  font-size: 11px;
  color: white;
  font-weight: 600;
  text-align: center;
}

.text-story-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-preview-center {
  font-size: 16px;
  font-weight: 700;
  color: white; /* Keep white because it's on a colored background */
  text-align: center;
  padding: 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  /* Center vertically in the available space */
  margin: auto 0; 
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  --padding-start: 8px;
  --padding-end: 8px;
  z-index: 10;
}

/* Friends Stories List */
.friends-stories-section {
  margin-bottom: 32px;
  padding-top: 20px;
}

.stories-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-story-group {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--glass-bg);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-story-group:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.05);
}

.story-ring {
  position: relative;
  padding: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.story-ring.has-new {
  background: linear-gradient(45deg, #ffbf00, #ff6b00);
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.story-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 3px solid var(--ion-background-color);
  position: relative;
  overflow: hidden;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: rgba(0, 0, 0, 0.3);
}

.story-user-info h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.story-user-info p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #888;
}

/* Empty & Loading States */
.empty-state, .loading-state {
  text-align: center;
  padding: clamp(30px, 10vw, 60px) 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h4 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
}

.empty-state p {
  color: #888;
  font-size: 14px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Story Viewer Modal */
.story-viewer-modal {
  --background: black;
}

.story-viewer {
  width: 100%;
  height: 100%;
  position: relative;
  background: black;
}

.progress-bars {
  position: absolute;
  top: max(8px, env(safe-area-inset-top));
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  z-index: 100;
}

.progress-bar {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: white;
  width: 0%;
  transition: width 0.1s;
}

.progress-fill.complete {
  width: 100%;
}

.progress-fill.active {
  width: 100%;
  animation: progress 5s linear;
}

@keyframes progress {
  from { width: 0%; }
  to { width: 100%; }
}

.story-header {
  position: absolute;
  top: calc(30px + env(safe-area-inset-top));
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  z-index: 99;
}

.story-user {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 191, 0, 0.2);
  border: 2px solid var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.user-details h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}

.user-details p {
  margin: 2px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}

.story-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.story-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.story-caption {
  position: absolute;
  bottom: calc(40px + env(safe-area-inset-bottom));
  left: 16px;
  right: 70px;
  background: rgba(0, 0, 0, 0.5);
  padding: 12px 16px;
  border-radius: 16px;
  color: white;
  font-size: clamp(0.85rem, 3.5vw, 0.95rem);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

@media (max-width: 360px) {
  .story-caption {
    left: 12px;
    bottom: calc(30px + env(safe-area-inset-bottom));
  }
}

.story-actions {
  position: absolute;
  bottom: calc(40px + env(safe-area-inset-bottom));
  right: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

@media (max-width: 360px) {
  .story-actions {
    gap: 12px;
  }
}

.like-section, .comment-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.heart-btn, .comment-btn {
  --padding-start: 0;
  --padding-end: 0;
  margin: 0;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
}

.heart-icon, .comment-icon {
  font-size: 34px;
}

.action-count {
  color: white;
  font-size: 13px;
  font-weight: 700;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}

.heart-icon.liked {
  animation: heart-pop 0.3s ease;
}

@keyframes heart-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.like-count {
  color: white;
  font-size: 13px;
  font-weight: 700;
}

.story-nav {
  position: absolute;
  inset: 0;
  display: flex;
  z-index: 50;
}

.nav-area {
  flex: 1;
  cursor: pointer;
}

/* Carousel Styles */
.card-carousel-wrapper {
  position: relative;
  width: 100%;
  min-height: 250px;
  aspect-ratio: 4/5;
  overflow: hidden;
  background: #000;
}

@media (max-width: 480px) {
  .card-carousel-wrapper {
    aspect-ratio: 1/1;
  }
}

.carousel-container {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.carousel-container::-webkit-scrollbar {
  display: none;
}

.carousel-item {
  flex: 0 0 100%;
  width: 100%;
  scroll-snap-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.carousel-dots {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 10;
}

.carousel-dots .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transition: all 0.3s;
}

.carousel-dots .dot.active {
  background: white;
  transform: scale(1.3);
}

.viewer-dots {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  z-index: 100;
}

.viewer-dots .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}

.viewer-dots .dot.active {
  background: white;
}

ion-toolbar {
  --background: transparent;
  --border-style: none;
}

/* What's on your mind? Styles */
.mind-box {
  margin-top: 16px;
  margin-bottom: 20px;
  padding: 12px;
  background: var(--glass-bg);
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
}

@media (max-width: 360px) {
  .mind-box {
    padding: 8px;
    border-radius: 16px;
  }
}

.mind-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.mind-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 191, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 1px solid rgba(255, 191, 0, 0.3);
}

.mind-input-trigger {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 16px;
  border-radius: 24px;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.mind-input-trigger:hover {
  background: rgba(255, 255, 255, 0.08);
}

.mind-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 0 4px 12px;
}

.mind-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.mind-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.mind-action:active {
  background: rgba(255, 255, 255, 0.05);
}

.mind-action ion-icon {
  font-size: 20px;
}

.mind-action span {
  font-size: 13px;
  font-weight: 600;
  color: #aaa;
}

/* Caption Input Styles */
.caption-input-area {
  margin-bottom: 16px;
  padding: 8px 16px;
  border-radius: 16px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.caption-input {
  --background: transparent;
  --color: white;
  --placeholder-color: rgba(255, 255, 255, 0.4);
  font-size: 15px;
  font-weight: 500;
}

/* Batch Modal Styles */
.batch-scroll-container {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 10px 0;
  margin-bottom: 20px;
  flex: 1;
}

.batch-preview-item {
  flex-shrink: 0;
  width: clamp(100px, 35vw, 140px);
  height: clamp(180px, 50vw, 240px);
  position: relative;
}

.batch-img-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #000;
}

.batch-img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.remove-batch-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  z-index: 5;
}

/* Nectar Feed & Cards */
.nectar-feed-section {
  padding: 10px 0;
}

.cards-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.nectar-card {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
}

@media (max-width: 480px) {
  .nectar-card {
    border-radius: 20px;
  }
}

.nectar-card:active {
  transform: scale(0.98);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.card-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 191, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 1px solid rgba(255, 191, 0, 0.3);
}

.card-user-info h4 {
  margin: 0;
  font-size: clamp(0.9rem, 4vw, 1rem);
  font-weight: 700;
  color: var(--ion-text-color);
}

.card-time {
  font-size: 11px;
  color: #888;
}

.card-drops {
  background: rgba(255, 191, 0, 0.15);
  padding: 4px 10px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid rgba(255, 191, 0, 0.2);
}

.drops-icon {
  font-size: 14px;
}

.drops-count {
  font-size: 12px;
  font-weight: 800;
  color: #ffbf00;
}

.card-content-area {
  width: 100%;
  position: relative;
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  min-height: 200px;
  max-height: 500px;
  overflow: hidden;
  background: #000;
}

.card-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.card-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 16px 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  color: white;
  font-size: clamp(0.85rem, 3.5vw, 0.95rem);
  line-height: 1.4;
  word-break: break-word;
}

@media (max-width: 360px) {
  .card-caption {
    padding: 16px 12px 10px;
  }
}

.card-text-story {
  padding: 40px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 250px;
}

.card-text-story p {
  font-size: clamp(1.2rem, 6vw, 1.5rem);
  font-weight: 700;
  line-height: 1.4;
  color: white;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.action-group {
  display: flex;
  gap: 4px;
}

.card-action-btn {
  --padding-start: 8px;
  --padding-end: 8px;
  font-weight: 700;
  font-size: 13px;
}

.card-action-btn ion-icon {
  font-size: 18px;
}

/* --- Keep existing styles for viewer and modals below --- */

/* Text Story Styles */
.text-story {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.text-story-content {
  max-width: 90%;
  text-align: center;
}

.text-story-content p {
  font-size: 28px;
  font-weight: 700;
  color: white;
  line-height: 1.4;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
  word-wrap: break-word;
}

/* Modal Styles */
.modal-wrapper {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  font-weight: 700;
}

/* Text Modal */
.text-input-container {
  border-radius: 16px;
  padding: 20px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s;
}

.text-story-input {
  --background: transparent;
  --color: white;
  --placeholder-color: rgba(255, 255, 255, 0.6);
  --padding-start: 0;
  --padding-end: 0;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
}

.color-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-label {
  font-size: 14px;
  font-weight: 600;
  color: #888;
}

.color-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.color-option {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
  border: 3px solid transparent;
}

.color-option:active {
  transform: scale(0.9);
}

.color-option.selected {
  border-color: white;
  box-shadow: 0 0 0 2px rgba(255, 191, 0, 0.5);
}

/* Preview Modal */
.preview-wrapper {
  justify-content: space-between;
}

.preview-image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.preview-image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-actions {
  display: flex;
  gap: 12px;
}

.preview-actions ion-button {
  flex: 1;
}

.story-slide {
  width: 100%;
  height: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Comments Modal Styles */
.comments-modal {
  --background: var(--ion-background-color);
  --border-radius: 20px 20px 0 0;
}

.comments-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--ion-background-color);
}

.comments-header, .modal-toolbar {
  --background: var(--ion-background-color);
  --color: var(--ion-text-color);
  --border-style: none;
}

.modal-toolbar ion-title {
  font-size: 18px;
  font-weight: 700;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.no-comments {
  text-align: center;
  padding: 40px;
  color: #888;
}

.comment-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 191, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.comment-bee-id {
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.comment-bee-id:hover {
  text-decoration: underline;
}

.comment-time {
  font-size: 12px;
  color: #888;
}

.comment-text {
  margin: 0;
  font-size: clamp(0.85rem, 3.5vw, 0.95rem);
  line-height: 1.4;
  color: var(--ion-text-color);
}

/* Modal Footer Styling for Floating Input */
.comments-footer {
  --background: var(--ion-background-color);
  padding: 12px 16px;
  padding-bottom: max(16px, calc(16px + env(safe-area-inset-bottom)));
  background: var(--ion-background-color);
}

.comments-content {
  --background: var(--ion-background-color);
}

.chat-input-area {
    padding: 6px 6px 6px 16px;
    border-radius: 28px;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    position: relative;
    z-index: 100;
    max-width: 500px;
    margin: 0 auto;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
}

.chat-textarea {
    --padding-top: 10px;
    --padding-bottom: 10px;
    --padding-start: 0;
    --background: transparent;
    font-size: 14px;
    color: var(--ion-text-color);
    font-weight: 500;
    max-height: 120px;
    flex: 1;
}

.comment-status-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: -8px;
}

.message-status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.message-status-indicator ion-spinner {
  width: 14px;
  height: 14px;
}

.message-status-indicator ion-icon {
  font-size: 14px;
}

.sent-icon {
  color: var(--ion-color-primary);
}

.error-icon {
  color: var(--ion-color-danger);
}

.chat-send-btn {
    width: 40px;
    height: 40px;
    background: var(--ion-color-primary);
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
    flex-shrink: 0;
}

.chat-send-btn:active {
    transform: scale(0.9);
}

.chat-send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.chat-send-btn.is-sending {
    background: var(--ion-color-step-300, #444);
    pointer-events: none;
}

.chat-send-btn ion-icon {
    font-size: 18px;
    color: black;
}

.gold-glow-mini {
    box-shadow: 0 0 15px rgba(255, 191, 0, 0.1);
}

.comments-scroll-content {
  --background: transparent;
  --padding-bottom: 80px;
}

.owner-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.view-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  font-size: 13px;
  font-weight: 700;
  gap: 4px;
}

.viewer-info {
  display: flex;
  flex-direction: column;
}

.viewer-bee-id {
  font-size: 15px;
  font-weight: 600;
}

.no-views {
  text-align: center;
  padding: 40px;
  color: #888;
}

.views-modal {
  --background: var(--ion-background-color);
  --border-radius: 20px 20px 0 0;
}

.views-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.views-list {
  padding: 16px;
}

.viewer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  transition: background 0.2s;
  cursor: pointer;
}

.viewer-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.viewer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 191, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.view-more-container {
  margin-top: 10px;
  padding-bottom: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.view-more-container ion-button {
  --color: var(--ion-color-primary);
  font-weight: 700;
}

.is-blurred .blurred-text {
  filter: blur(5px);
  user-select: none;
  opacity: 0.7;
}

.report-btn {
  --color: #eb445a;
  opacity: 0.6;
}

.report-btn:active {
  opacity: 1;
}

.viewer-action ion-button {
  --color: var(--ion-color-primary);
  font-weight: 800;
  font-size: 12px;
}

/* Comment Reactions */
.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  gap: 8px;
}

.comment-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reaction-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.reaction-pill.reacted {
  background: rgba(255, 191, 0, 0.15);
  border-color: rgba(255, 191, 0, 0.3);
}

.reaction-pill:active {
  transform: scale(0.9);
}

.reaction-pill .emoji {
  font-size: 14px;
}

.reaction-pill .count {
  font-size: 11px;
  font-weight: 700;
  color: #888;
}

.reaction-pill.reacted .count {
  color: #ffbf00;
}

.comment-react-btn {
  --padding-start: 4px;
  --padding-end: 4px;
  margin: 0 !important;
  height: 24px;
  width: 24px;
  min-height: 24px;
}

.emoji-picker-popover {
  --width: 280px;
}

.emoji-picker-content {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px;
  background: var(--ion-background-color);
}

.emoji-option {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.emoji-option:active {
  transform: scale(0.9);
  background: rgba(255, 191, 0, 0.2);
}

.sponsored-label {
  font-size: 0.75rem;
  color: var(--ion-color-secondary);
  font-weight: 500;
  margin-top: 2px;
}

.ad-card {
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
  background: rgba(var(--ion-color-primary-rgb), 0.03);
}

.cta-btn {
  --border-radius: 20px;
  font-weight: 600;
  text-transform: none;
  font-size: 0.8rem;
  height: 28px;
  margin-right: 8px;
}

.ad-card .card-avatar {
  background: var(--ion-color-light);
  border: 1px solid var(--ion-color-primary);
}
</style>
