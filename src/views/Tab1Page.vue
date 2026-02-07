<template>
  <ion-page>
    <ion-content :fullscreen="true" class="hive-content" :scroll-y="false">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content 
          :pulling-icon="chevronDown"
          pulling-text="Pull to sync Hive"
          refreshing-spinner="bubbles"
          refreshing-text="Gathering nectar..."
        ></ion-refresher-content>
      </ion-refresher>

      <!-- Super Admin View -->
      <div v-if="isSuperAdmin" class="super-admin-dashboard-container">
        <AdminDashboard />
      </div>

      <!-- Segment Switcher (Regular Users) -->
      <div v-else class="main-segment-wrapper">
        <ion-segment 
          v-model="activeTab" 
          mode="ios" 
          class="main-nav-segment"
          @ionChange="Haptics.impact({ style: ImpactStyle.Light })"
        >
          <ion-segment-button value="hive">
            <ion-label>GARDEN</ion-label>
          </ion-segment-button>
          <ion-segment-button value="messages">
            <ion-label>CHATS</ion-label>
            <div v-if="totalUnread > 0" class="tab-unread-badge">{{ totalUnread }}</div>
          </ion-segment-button>
          <ion-segment-button value="hub">
            <ion-label>HIVE</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <div class="hive-header" v-if="activeTab === 'hive' && !isSuperAdmin && !showSplash">
        <div class="header-right" :class="{ 'header-squash': true }">
          <!-- Primary Actions -->
          <div @click="openNotificationsModal" class="nest-notif-btn">
            <ion-icon :icon="notificationsOutline" class="radar-header-icon"></ion-icon>
            <div v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</div>
          </div>

          <div @click="router.push('/tabs/radar')" class="nest-notif-btn">
            <ion-icon :icon="locationOutline" class="radar-header-icon"></ion-icon>
          </div>

          <div @click="isRequestModalOpen = true" class="nest-notif-btn">
            <ion-icon :icon="peopleOutline" class="radar-header-icon"></ion-icon>
            <div v-if="pendingRequests.length > 0" class="notif-badge">{{ pendingRequests.length }}</div>
          </div>

          <!-- Collapsible Secondary Actions -->
          <div class="collapsible-wrapper" :class="{ 'is-expanded': isHeaderExpanded }">
            <div class="collapsible-inner">
              <div @click="router.push('/tabs/leaderboard')" class="nest-notif-btn secondary-btn">
                <ion-icon :icon="trophyOutline" class="radar-header-icon"></ion-icon>
              </div>
              <div v-if="isAdmin" @click="router.push('/tabs/admin')" class="nest-notif-btn secondary-btn">
                <ion-icon :icon="shieldOutline" class="radar-header-icon"></ion-icon>
              </div>
              <div @click="router.push('/tabs/reminders')" class="nest-notif-btn secondary-btn">
                <ion-icon :icon="alarmOutline" class="radar-header-icon"></ion-icon>
              </div>
              <div @click="isGardenModalOpen = true" class="nest-notif-btn secondary-btn">
                <ion-icon :icon="optionsOutline" class="radar-header-icon"></ion-icon>
              </div>
            </div>
          </div>

          <!-- Toggle Toggle (Arrow moved to bottom) -->
          <div @click="toggleHeader" class="nest-notif-btn toggle-btn gold-glow" :class="{ 'toggle-active': isHeaderExpanded }">
            <ion-icon :icon="chevronDown" class="toggle-icon" :class="{ 'rotated': isHeaderExpanded }"></ion-icon>
          </div>
        </div>
      </div>

      <!-- The Dynamic Hive Area -->
      <div v-if="activeTab === 'hive' && !isSuperAdmin && !showSplash" class="hive-background">
        <div 
          v-for="bee in beeStates" 
          v-show="isBeeVisible(bee.beeId)"
          :key="bee.beeId" 
          :class="['flying-bee', { 'is-me': bee.beeId === userBeeId, 'dragging': bee.isDragging }]"
          :style="{
            transform: `translate3d(${bee.x}px, ${bee.y}px, 0) scale(${dynamicBeeScale})`,
            transition: bee.isDragging ? 'none' : `transform ${bee.speed}ms linear`,
            '--bee-scale': dynamicBeeScale,
            'z-index': bee.isDragging ? 1000 : 1
          }"
          @mousedown="onDragStart($event, bee)"
          @touchstart="onDragStart($event, bee)"
          @click="handleBeeClick(bee)"
          @contextmenu.prevent
        >
          <div class="bee-wrapper">
            <!-- Message Bubble -->
            <transition name="pop">
              <div v-if="bee.lastMessage" class="buzz-bubble" @contextmenu.prevent="handleFlashBuzzLongPress(bee)">
                <p>{{ truncateMessage(bee.lastMessage) }}</p>
              </div>
            </transition>

            <div :class="['bee-icon', { 'bee-juicy': bee.lastMessage }]">
              <BeeComposite 
                class="bee-icon-composite"
                :customization="bee.customization" 
                :animated="true" 
                :scale="0.3"
                :flipped="bee.isFlipped"
              />
              <!-- Unread Badge -->
              <div v-if="unreadCounts[bee.beeId] > 0" class="unread-badge animate-pop">
                {{ unreadCounts[bee.beeId] }}
              </div>
              <!-- Streak Badge -->
              <div class="bee-name-tag">
                <span v-if="bee.beeId !== userBeeId" :class="['status-dot', { online: bee.isOnline }]"></span>
                {{ bee.beeId === userBeeId ? 'YOU' : bee.beeId }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="beeStates.length === 0" class="empty-hive">
          <template v-if="colonyIds.length === 0">
            <div class="lonely-nest">
              <span class="giant-emoji">🍯</span>
              <h2>Your Hive is Empty</h2>
              <p>Add some bees to your colony to start seeing them fly around!</p>
              <ion-button fill="outline" color="primary" @click="openSearchModal" class="invite-btn">
                Invite a Bee
              </ion-button>
            </div>
          </template>
          <template v-else>
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Scouting the field...</p>
          </template>
        </div>

        <!-- Dynamic Flowering Plants (Clustered in Center) -->
        <FloweringPlant x="45%" y="4vmin" :scale="0.5" :delay="'0.3s'" :active="gardenActive" :withGrass="true" :type="1" :seed="0.1" />
        <FloweringPlant x="55%" y="4vmin" :scale="0.45" :delay="'0.8s'" :active="gardenActive" :withGrass="true" :type="2" :seed="0.8" />
        <FloweringPlant x="50%" y="2vmin" :scale="0.55" :delay="'0s'" :active="gardenActive" :withGrass="true" :type="3" :seed="0.5" />
        <FloweringPlant x="48%" y="1vmin" :scale="0.35" :delay="'1.2s'" :active="gardenActive" :type="2" :seed="0.3" />
        <FloweringPlant x="52%" y="1vmin" :scale="0.35" :delay="'1.5s'" :active="gardenActive" :type="1" :seed="0.9" />
      </div>

      <!-- Messages List Tab -->
      <div v-if="activeTab === 'messages' && !isSuperAdmin && !showSplash" class="messages-tab-container animate-fade-in">
        <div class="messages-header">
           <div class="search-bar-inline glass-panel">
              <ion-icon :icon="searchOutline"></ion-icon>
              <input type="text" placeholder="Search conversations..." v-model="messageSearchQuery" />
           </div>
        </div>

        <div v-if="filteredConversations.length === 0" class="empty-messages-state">
           <span class="giant-emoji">🌸</span>
           <h3>No Conversations Yet</h3>
           <p>Start buzzing with your friends in the Hive!</p>
           <ion-button fill="clear" color="primary" @click="activeTab = 'hive'">Return to Hive</ion-button>
        </div>

        <div v-else class="convo-list">
           <div 
            v-for="convo in filteredConversations" 
            :key="convo.beeId" 
            class="convo-item"
            @click="openConvoFromList(convo)"
            @contextmenu.prevent="handleConvoLongPress(convo)"
           >
              <div class="convo-avatar">
                 <div class="hex-mini">
                    <BeeComposite 
                      :customization="convo.beeRef?.customization" 
                      :animated="true" 
                      :scale="0.25"
                    />
                 </div>
                 <div v-if="convo.isOnline" class="online-status-dot"></div>
              </div>
              <div class="convo-info">
                 <div class="convo-top-row">
                    <span class="convo-name">{{ convo.beeId }}</span>
                    <span class="convo-time">{{ getTimeAgo(convo.lastBuzz.timestamp) }}</span>
                 </div>
                 <div class="convo-bottom-row">
                    <p :class="['last-msg', { 'unread': unreadCounts[convo.beeId] > 0 }]">
                      {{ convo.lastBuzz.sender === userBeeId ? 'You: ' : '' }}{{ convo.lastBuzz.message }}
                    </p>
                    <div v-if="unreadCounts[convo.beeId] > 0" class="unread-dot"></div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Hive Hub Tab -->
      <div v-if="activeTab === 'hub' && !isSuperAdmin && !showSplash" class="hub-tab-container animate-fade-in">
        <HiveHub />
      </div>

      <!-- Search/Add Bee Modal -->
      <ion-modal 
        :is-open="isSearchModalOpen" 
        @didDismiss="isSearchModalOpen = false"
        :initial-breakpoint="0.7"
        :breakpoints="[0, 0.7, 0.9]"
        class="search-modal"
      >
        <div class="modal-wrapper">
          <div class="modal-header">
            <h2>Add Bee to Hive</h2>
            <p>Enter the Bee ID to find them in the Hive.</p>
          </div>
          <ion-content class="modal-main-content" :scroll-y="true" data-ion-no-swipe="true">
            <div class="modal-body-inner">
              <div class="search-input-area glass-panel">
                <ion-item lines="none" class="search-item">
                  <ion-icon :icon="searchOutline" slot="start"></ion-icon>
                  <ion-input 
                    placeholder="e.g. QUEEN_BEE_1" 
                    v-model="searchId" 
                    class="custom-input"
                    @keyup.enter="handleFindBee"
                  ></ion-input>
                </ion-item>
              </div>

              <!-- Submit Button moved directly below input -->
              <button @click="handleFindBee" class="buzz-send-btn gold-glow" :disabled="!searchId">
                <div class="btn-inner">
                  <span>SUBMIT</span>
                  <ion-icon :icon="checkmarkCircleOutline"></ion-icon>
                </div>
              </button>
              
              <div class="divider">
                  <span>OR</span>
              </div>

              <button @click="handleScan" class="scan-btn glass-panel gold-glow-mini">
                <div class="btn-inner">
                  <ion-icon :icon="qrCodeOutline"></ion-icon>
                  <span>SCAN QR CODE</span>
                </div>
              </button>
            </div>
          </ion-content>
        </div>
      </ion-modal>

      <!-- Friend Requests (Joining the Nest) Modal -->
      <ion-modal 
        :is-open="isRequestModalOpen" 
        @didDismiss="isRequestModalOpen = false"
        :initial-breakpoint="0.7"
        :breakpoints="[0, 0.7, 0.9]"
        class="search-modal"
      >
        <div class="modal-wrapper">
          <div class="modal-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
              <div style="text-align: left;">
                <h2>Joining the Nest</h2>
                <p>These bees want to join your colony.</p>
              </div>
              <ion-button fill="solid" mode="ios" @click="openSearchModal" class="add-friend-header-btn">
                <ion-icon :icon="personAddOutline" slot="start"></ion-icon>
                <ion-label>ADD FRIEND</ion-label>
              </ion-button>
            </div>
          </div>
          <ion-content class="modal-main-content" :scroll-y="true" data-ion-no-swipe="true">
            <div class="modal-body-inner">
              <div v-if="pendingRequests.length === 0" class="empty-requests">
                  <span class="giant-emoji">🍯</span>
                  <p>No new bees waiting at the door.</p>
              </div>
              <div v-else class="requests-list">
                  <div v-for="req in pendingRequests" :key="req.id" class="request-card glass-panel">
                      <div class="request-info">
                          <div class="mini-bee-avatar">
                              <BeeComposite 
                                :customization="getBeeCustomization(req.from)" 
                                :scale="0.18" 
                                :animated="true" 
                              />
                          </div>
                          <div class="request-details">
                              <h3>{{ req.from }}</h3>
                              <p>Sent: {{ new Date(req.timestamp).toLocaleDateString() }}</p>
                          </div>
                      </div>
                      <div class="request-actions">
                          <button @click="handleAcceptRequest(req.from)" class="accept-btn">
                              WELCOME
                          </button>
                          <button @click="handleRejectRequest(req.from)" class="reject-btn">
                              <ion-icon :icon="closeOutline"></ion-icon>
                          </button>
                      </div>
                  </div>
              </div>
            </div>
          </ion-content>
        </div>
      </ion-modal>

      <!-- Hive Notifications Modal -->
      <ion-modal 
        :is-open="isNotifModalOpen" 
        @didDismiss="isNotifModalOpen = false"
        :initial-breakpoint="0.8"
        :breakpoints="[0, 0.8, 1]"
        class="search-modal"
      >
        <div class="modal-wrapper">
          <div class="modal-header">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px;">
              <h2 style="margin: 0;">Hive Activity</h2>
              <div style="display: flex; gap: 5px;">
                <ion-button fill="clear" size="small" @click="clearNotifications" v-if="notifications.length > 0" style="--color: #888; font-weight: 800; font-size: 11px;">
                  CLEAR ALL
                </ion-button>
                <ion-button fill="clear" size="small" @click="markAllAsRead" v-if="unreadCount > 0" style="font-weight: 800; font-size: 11px;">
                  MARK READ
                </ion-button>
              </div>
            </div>
          </div>
          <ion-content class="modal-main-content" :scroll-y="true" data-ion-no-swipe="true">
            <div class="modal-body-inner">
              <div v-if="notifications.length === 0" class="empty-requests">
                  <span class="giant-emoji">🔔</span>
                  <p>Silence in the field...</p>
              </div>
              <div v-else class="requests-list">
                  <div 
                    v-for="notif in sortedNotifications" 
                    :key="notif.id" 
                    class="request-card glass-panel"
                    :class="{ 'unread-notif': !notif.read }"
                    @click="handleNotifClick(notif)"
                  >
                      <div class="request-info">
                          <div class="mini-bee-avatar">
                              <BeeComposite 
                                :customization="getBeeCustomization(notif.from)" 
                                :scale="0.18" 
                                :animated="true" 
                              />
                          </div>
                          <div class="request-details">
                              <div style="display: flex; align-items: center; gap: 6px;">
                                <span class="notif-type-emoji">{{ getNotifEmoji(notif.type) }}</span>
                                <h3 :style="{ color: notif.read ? '#888' : 'white', margin: 0 }">{{ notif.from }}</h3>
                              </div>
                              <p :style="{ color: notif.read ? '#666' : '#aaa' }">{{ notif.message }}</p>
                              <span class="notif-time">{{ getTimeAgo(notif.timestamp) }}</span>
                          </div>
                      </div>
                      <div v-if="!notif.read" class="unread-dot-notif"></div>
                  </div>
              </div>
            </div>
          </ion-content>
        </div>
      </ion-modal>

      <!-- Garden Management Modal -->
      <ion-modal 
        :is-open="isGardenModalOpen" 
        @didDismiss="isGardenModalOpen = false; gardenSearchQuery = ''"
        :initial-breakpoint="0.7"
        :breakpoints="[0, 0.7, 1]"
        class="search-modal"
      >
        <div class="modal-wrapper">
          <div class="modal-header">
            <h2 style="margin: 0;">Garden Management</h2>
            <p style="margin: 5px 0 0;">Toggle which bees appear in your garden swarm.</p>
          </div>
          <ion-content class="modal-main-content" :scroll-y="true">
            <div class="modal-body-inner" style="padding-top: 0;">
              <!-- Search Bar -->
              <div class="search-input-area glass-panel" style="margin-bottom: 20px; margin-top: 10px;">
                <ion-item lines="none" class="search-item">
                  <ion-icon :icon="searchOutline" slot="start"></ion-icon>
                  <ion-input 
                    placeholder="Search bees in garden..." 
                    v-model="gardenSearchQuery" 
                    class="custom-input"
                  ></ion-input>
                </ion-item>
              </div>

              <div v-if="filteredGardenBees.length === 0" class="empty-requests">
                <span class="giant-emoji">🐝</span>
                <p>No bees found matching "{{ gardenSearchQuery }}"</p>
              </div>
              
              <div v-else class="requests-list">
                <div v-for="bee in filteredGardenBees" :key="bee.beeId" class="request-card glass-panel garden-manage-item">
                  <div class="request-info">
                    <div class="mini-bee-avatar">
                      <BeeComposite 
                        :customization="bee.customization" 
                        :scale="0.18" 
                        :animated="true" 
                      />
                    </div>
                    <div class="request-details">
                      <h3>{{ bee.beeId === userBeeId ? 'YOU' : bee.beeId }}</h3>
                      <p :class="{ 'hidden-status': !isBeeVisible(bee.beeId) }">
                        {{ isBeeVisible(bee.beeId) ? 'Buzzing in Garden' : 'Resting / Hidden' }}
                      </p>
                    </div>
                  </div>
                  <ion-toggle 
                    mode="ios"
                    class="garden-toggle"
                    :checked="isBeeVisible(bee.beeId)"
                    @ionChange="toggleGardenBee(bee.beeId)"
                  ></ion-toggle>
                </div>
              </div>
            </div>
          </ion-content>
        </div>
      </ion-modal>

      <ion-modal 
        ref="buzzModal"
        :is-open="isModalOpen" 
        @didDismiss="isModalOpen = false; isViewingHistory = false" 
        @didPresent="isViewingHistory ? scrollToBottom(0) : null"
        :initial-breakpoint="activeTab === 'messages' ? 1 : 1" 
        :breakpoints="activeTab === 'messages' ? [0, 1] : [0, 1]"
        class="buzz-modal"
      >
        <div class="modal-wrapper">
          <!-- Fixed Header -->
          <div class="modal-header" :class="{ 'history-mode-header': isViewingHistory }">
            <div class="segment-container" v-if="saveHistoryEnabled">
              <ion-segment 
                :value="isViewingHistory ? 'history' : 'buzz'" 
                @ionChange="handleSegmentChange"
                mode="ios"
                class="custom-segment"
              >
                <ion-segment-button value="buzz">
                  <ion-label>BUZZ</ion-label>
                </ion-segment-button>
                <ion-segment-button value="history">
                  <ion-label>MESSAGES</ion-label>
                </ion-segment-button>
              </ion-segment>
            </div>

            <!-- Full Profile Header (Buzz Mode) -->
            <template v-if="!isViewingHistory">
              <div class="large-avatar-hex" @click="goToProfile(selectedBee?.beeId)" style="cursor: pointer;">
                <div class="hexagon hex-glow">
                  <BeeComposite 
                    v-if="selectedBee"
                    :customization="selectedBee.customization" 
                    :animated="true" 
                    :scale="0.4"
                  />
                  <span v-else>🐝</span>
                </div>
                <div v-if="selectedBee && getStreakForBee(selectedBee.beeId) > 0" class="modal-streak-badge">
                  <span class="streak-fire">🔥</span>
                  <span class="streak-count">{{ getStreakForBee(selectedBee.beeId) }}</span>
                </div>
              </div>
              <h2 @click="goToProfile(selectedBee?.beeId)" style="cursor: pointer; position: relative; z-index: 10; margin-bottom: 2px;">{{ selectedBee?.beeId }}</h2>
              <div class="header-links">
                <div @click="goToProfile(selectedBee?.beeId)" class="view-profile-link">VIEW PROFILE</div>
              </div>

            </template>


            <!-- Minimalist/Chat Header (History Mode) -->
            <template v-else>
              <div class="compact-chat-header animate-in">
                <div class="compact-avatar" @click="goToProfile(selectedBee?.beeId)">
                  <BeeComposite 
                    v-if="selectedBee"
                    :customization="selectedBee.customization" 
                    :animated="true" 
                    :scale="0.25"
                  />
                  <span v-else>🐝</span>
                </div>
                <div class="compact-details">
                  <h3 @click="goToProfile(selectedBee?.beeId)">{{ selectedBee?.beeId }}</h3>
                  <span :class="['mini-status', { online: selectedBee?.isOnline }]">
                    {{ getOfflineDuration(selectedBee?.lastSeen) }}
                  </span>
                </div>

                <button 
                  v-if="selectedBee?.isOnline"
                  class="chat-header-call-btn gold-glow-mini" 
                  @click="handleVoiceCall"
                >
                    <ion-icon :icon="callOutline"></ion-icon>
                </button>

              </div>
            </template>

          </div>
          
          <!-- Scrollable Body Content -->
          <ion-content ref="historyContentRef" class="modal-main-content" :scroll-y="true" data-ion-no-swipe="true">
            <div class="modal-body-inner">
              <div v-if="!isViewingHistory" class="compose-view animate-in">
                  <div class="message-input-area glass-panel">
                    <ion-textarea 
                      placeholder="What's the buzz?..." 
                      v-model="quickMessage" 
                      :auto-grow="true"
                      :rows="3"
                      class="custom-textarea"
                    ></ion-textarea>
                    
                    <!-- Image Selection -->
                    <div class="input-actions">
                      <button @click="takePhoto" class="image-select-btn">
                          <ion-icon :icon="cameraOutline"></ion-icon>
                          <span v-if="!selectedImage">Add Photo</span>
                      </button>
                    </div>
                  </div>

                  <!-- Attached Image Preview -->
                  <div v-if="selectedImage" class="image-preview-container animate-in">
                      <img :src="selectedImage" class="preview-img" />
                      <div @click="clearImage" class="clear-img-btn">
                          <ion-icon :icon="closeCircle"></ion-icon>
                      </div>
                  </div>
                  <!-- <div class="preset-section">
                    <p class="section-label">Quick Messages</p>
                    <div class="preset-chips">
                       <div 
                        v-for="p in presets" 
                        :key="p" 
                        @click="quickMessage = p" 
                        :class="['chip', { active: quickMessage === p }]"
                       >
                         {{ p }}
                       </div>
                    </div>
                  </div> -->

                  <!-- Send Action (Buzz Mode) -->
                  <div class="modal-footer-action">
                    <div class="compose-actions-row" v-if="!isRecording">
                      <ion-button 
                        @click="handleSendBuzz" 
                        class="buzz-send-btn-ion flex-1" 
                        :disabled="isSending"
                      >
                        <div v-if="!isSending" class="btn-inner">
                          <span>SEND FLASH BUZZ</span>
                          <ion-icon :icon="flash" slot="end"></ion-icon>
                        </div>
                        <ion-spinner v-else name="crescent" color="dark"></ion-spinner>
                      </ion-button>
                      <button @click="startAudioRecording" class="voice-btn-round">
                         <ion-icon :icon="micOutline"></ion-icon>
                      </button>
                    </div>

                    <div class="chat-input-area recording-mode glass-panel gold-glow-mini vibrate-subtle" v-else>
                      <div class="recording-status">
                        <div class="recording-dot"></div>
                        <span class="recording-timer">{{ audioFormatTime(recordingTime) }}</span>
                      </div>
                      <div class="recording-actions">
                        <button @click="cancelAudioRecording" class="cancel-text-btn">CANCEL</button>
                        <button @click="sendAudioRecording" class="send-round-btn">
                          <ion-icon :icon="flash"></ion-icon>
                        </button>
                      </div>
                    </div>
                    <div class="voice-call-secondary-action animate-in" v-if="selectedBee?.isOnline && !isRecording">
                      <button @click="handleVoiceCall" class="wide-call-btn">
                        <ion-icon :icon="callOutline"></ion-icon>
                        START VOICE CALL
                      </button>
                    </div>
                  </div>

              </div>

              <!-- Buzz History Section -->
              <div v-else class="history-view animate-in" data-ion-no-swipe="true">
                  <div v-if="currentBeeHistory.length === 0" class="empty-history">
                      <ion-icon :icon="timeOutline"></ion-icon>
                      <p>No past buzzes recorded with this bee.</p>
                  </div>
                  <div v-else class="history-list" ref="historyList" data-ion-no-swipe="true">
                      <div 
                        v-for="(b, idx) in currentBeeHistory" 
                        :key="b.id" 
                        :class="[
                          'history-item', 
                          b.sender === userBeeId ? 'sent' : 'received',
                          { 
                            'is-first': idx === 0 || currentBeeHistory[idx-1].sender !== b.sender,
                            'is-last': idx === currentBeeHistory.length - 1 || currentBeeHistory[idx+1].sender !== b.sender,
                            'has-next': idx < currentBeeHistory.length - 1 && currentBeeHistory[idx+1].sender === b.sender
                          }
                        ]"
                        @contextmenu.prevent="handleMessageLongPress(b, $event)"
                      >
                        <div class="msg-bubble" :class="{ 'has-media': b.image || b.audioUrl }" @click="handleMessageClick(b)">
                          <div v-if="b.image" class="msg-image-wrapper">
                              <img :src="b.image" class="msg-image" @click.stop="viewFullImage(b.image)" @load="scrollToBottom(0)" />
                          </div>
                          <AudioBubble 
                            v-if="b.audioUrl" 
                            :src="b.audioUrl" 
                            :duration="b.duration || 0" 
                            :msgId="b.id" 
                            :is-own="b.sender === userBeeId" 
                            :customization="b.sender === userBeeId ? myCustomization : selectedBee?.customization"
                          />
                          <p v-else-if="b.message">{{ b.message }}</p>
                          <span class="msg-time">
                            {{ new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                            <span v-if="b.sender === userBeeId" class="read-receipt">
                               <ion-spinner name="crescent" v-if="b.status === 'sending'" class="receipt-spinner"></ion-spinner>
                               <ion-icon :icon="b.status === 'read' ? checkmarkDone : checkmark" :class="{ 'seen': b.status === 'read' }" v-else-if="b.status === 'read' || b.status === 'delivered' || b.status === 'sent' || !b.status"></ion-icon>
                               <ion-icon :icon="alertCircleOutline" class="error-receipt" v-else-if="b.status === 'error'"></ion-icon>
                            </span>
                          </span>
                          
                          <!-- Reactions -->
                          <div v-if="b.reactions && Object.keys(b.reactions).length > 0" class="reactions-container">
                            <div 
                              v-for="(users, emoji) in b.reactions" 
                              :key="emoji" 
                              v-show="users.length > 0"
                              :class="['reaction-pill', { 'reacted': users.includes(userBeeId || '') }]"
                              @click.stop="reactToBuzz(b, emoji)"
                            >
                              <span class="emoji">{{ emoji }}</span>
                              <span class="count">{{ users.length }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                  </div>
              </div>
            </div>
          </ion-content>

          <!-- Fixed Footer (History Mode) -->
          <div v-if="isViewingHistory" class="modal-footer animate-in">
             <div class="chat-input-area glass-panel gold-glow-mini" v-if="!isRecording">
                <button @click="takePhoto" class="chat-tool-btn">
                    <ion-icon :icon="selectedImage ? imageOutline : cameraOutline" :class="{ 'has-img': selectedImage }"></ion-icon>
                </button>
                <ion-textarea 
                    placeholder="Buzz back..." 
                    v-model="quickMessage" 
                    :auto-grow="true" 
                    :rows="1"
                    class="chat-textarea"
                    @keyup.enter="handleSendBuzz"
                ></ion-textarea>
                <button @click="startAudioRecording" class="chat-tool-btn">
                    <ion-icon :icon="micOutline"></ion-icon>
                </button>
                <button @click="handleSendBuzz" :disabled="(!quickMessage && !selectedImage) || isSending" class="chat-send-btn">
                    <ion-icon v-if="!isSending" :icon="flash"></ion-icon>
                    <ion-spinner v-else name="crescent" color="dark" size="small"></ion-spinner>
                </button>
            </div>
            
            <div class="chat-input-area recording-mode glass-panel gold-glow-mini vibrate-subtle" v-else>
               <div class="recording-status">
                 <div class="recording-dot"></div>
                 <span class="recording-timer">{{ audioFormatTime(recordingTime) }}</span>
               </div>
               <div class="recording-actions">
                 <button @click="cancelAudioRecording" class="cancel-text-btn">CANCEL</button>
                 <button @click="sendAudioRecording" class="send-round-btn">
                   <ion-icon :icon="flash"></ion-icon>
                 </button>
               </div>
            </div>

            <!-- Chat Preview Image -->
            <div v-if="selectedImage" class="chat-preview-mini animate-in">
                <img :src="selectedImage" />
                <div @click="clearImage" class="clear-mini-btn">
                    <ion-icon :icon="closeCircle"></ion-icon>
                </div>
            </div>
          </div>
        </div>
      </ion-modal>

      <!-- Full Image Viewer -->
      <ion-modal :is-open="!!fullImage" @didDismiss="fullImage = null" class="full-img-modal">
        <div class="full-img-container" @click="fullImage = null">
          <img v-if="fullImage" :src="fullImage" />
          <ion-button fill="clear" color="light" class="close-btn" @click="fullImage = null">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>
      </ion-modal>

      <ion-popover 
        :is-open="isEmojiPickerOpen" 
        :event="emojiPickerEvent"
        @didDismiss="isEmojiPickerOpen = false; if(!confirmingDelete) selectedBuzzForReaction = null"
        class="emoji-picker-popover"
        :show-backdrop="true"
      >
        <div class="emoji-picker-container">
          <div class="emoji-carousel">
            <div 
              v-for="emoji in commonEmojis" 
              :key="emoji" 
              class="emoji-option"
              @click="handleEmojiSelect(emoji)"
            >
              {{ emoji }}
            </div>
          </div>
          <div class="emoji-delete-btn" @click="confirmDeleteBuzz">
            <ion-icon :icon="trash"></ion-icon>
          </div>
        </div>
      </ion-popover>

      <!-- Hive Splash Screen -->
      <HiveSplash :show="showSplash" status-text="Gathering the swarm..." />

      <!-- Daily Login Modal -->
      <DailyLoginModal 
        :is-open="isDailyLoginOpen" 
        @close="isDailyLoginOpen = false"
        @claimed="isDailyLoginOpen = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonContent, 
  IonSpinner, IonModal, IonTextarea, IonIcon, IonSegment, IonSegmentButton,
  onIonViewWillEnter,
  toastController, alertController, actionSheetController, IonFab, IonFabButton, IonInput,
  IonRefresher, IonRefresherContent, IonButton, IonItem, IonLabel, IonList, IonHeader, IonToolbar, IonTitle,
  IonPopover, IonFooter, IonToggle
} from '@ionic/vue';
import { 
  flash, checkmarkCircleOutline, add, searchOutline, 
  chevronDown, trash, closeOutline, alertCircleOutline,
  timeOutline, chatbubbleOutline, cameraOutline, imageOutline, closeCircle,
  qrCodeOutline, locationOutline, scanOutline, trophyOutline, micOutline, notificationsOutline, personAddOutline,
  checkmark, checkmarkDone, leafOutline, eyeOutline, eyeOffOutline, shieldOutline, peopleOutline, optionsOutline,
  callOutline, alarmOutline
} from 'ionicons/icons';

import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import HiveSplash from '@/components/HiveSplash.vue';
import AdminDashboard from '@/components/AdminDashboard.vue';
import { useBuzzService } from '@/services/BuzzService';
import { useUserService } from '@/services/UserService';
import { useStreakService } from '@/services/StreakService';
import { useAudioService } from '@/services/AudioService';
import { useNotificationService } from '@/services/NotificationService';
import AudioBubble from '@/components/AudioBubble.vue';
import { useRouter, useRoute } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { App } from '@capacitor/app';
import FloweringPlant from '@/components/FloweringPlant.vue';
import BeeComposite from '@/components/BeeComposite.vue';
import DailyLoginModal from '@/components/DailyLoginModal.vue';
import { useDailyLoginService } from '@/services/DailyLoginService';
import { useCallService } from '@/services/CallService';
import HiveHub from '@/components/HiveHub.vue';


interface BeeState {
  beeId: string;
  x: number;
  y: number;
  speed: number;
  isOnline: boolean;
  pushToken?: string;
  lastMessage?: string;
  lastMessageId?: string;
  isDragging?: boolean;
  customization?: { top: string, body: string, eyes: string };
  isFlipped?: boolean;
  lastSeen?: string;
}

const { 
    sendBuzz, sendAudioBuzz, sendVibrate, buzzes, saveHistoryEnabled, 
    getBuzzesForBee, sendBuzzReaction, unreadCounts, clearUnread, sendReadReceipt,
    deleteBuzz, deleteConversation
} = useBuzzService();
const { 
  isRecording, 
  recordingTime, 
  requestMicPermission,
  startRecording, 
  stopRecording, 
  cancelRecording, 
  uploadAudio,
  formatTime: audioFormatTime 
} = useAudioService();
const { 
    userBeeId, addFriend, removeFriend, getFriends, 
    getPendingRequests, acceptFriendRequest, rejectFriendRequest,
    getColonyMembers, isAdmin, isSuperAdmin
} = useUserService();

const { startCall } = useCallService();

const activeTab = ref('hive'); // 'hive' or 'messages'

const messageSearchQuery = ref('');

const totalUnread = computed(() => {
    return Object.values(unreadCounts.value).reduce((sum, count) => sum + count, 0);
});

const filteredConversations = computed(() => {
    // 1. Group buzzes by conversation partner
    const map = new Map<string, any>();
    
    buzzes.value.forEach(b => {
        // Exclude room buzzes from standard message history
        if (b.type === 'ROOM_BUZZ' || b.type === 'ROOM_BUZZ_AUDIO') return;

        const partnerId = b.sender === userBeeId.value ? b.recipient : b.sender;
        if (!partnerId || partnerId === 'You') return;
        
        if (!map.has(partnerId) || new Date(b.timestamp) > new Date(map.get(partnerId).lastBuzz.timestamp)) {
            const bee = beeStates.value.find(s => s.beeId === partnerId);
            map.set(partnerId, {
                beeId: partnerId,
                lastBuzz: b,
                isOnline: bee?.isOnline || false,
                beeRef: bee
            });
        }
    });

    const list = Array.from(map.values());

    // 2. Sort by latest message
    list.sort((a, b) => new Date(b.lastBuzz.timestamp).getTime() - new Date(a.lastBuzz.timestamp).getTime());

    // 3. Filter by search query
    if (!messageSearchQuery.value.trim()) return list;
    const q = messageSearchQuery.value.toLowerCase();
    return list.filter(c => c.beeId.toLowerCase().includes(q));
});

const openConvoFromList = (convo: any) => {
    if (convo.beeRef) {
        openBuzzModal(convo.beeRef, true);
    } else {
        // Fallback if bee not in current hive state
        openBuzzModal({ beeId: convo.beeId }, true);
    }
};

const {
    notifications,
    sortedNotifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearNotifications
} = useNotificationService();

// Tutorial State
const showTutorial = ref(false);
const currentTutorialStep = ref(0);
const tutorialSteps = [
  {
    title: 'Welcome to your Hive!',
    text: 'This is where you and your friends will fly around in real-time.',
    icon: flash
  },
  {
    title: 'Tap Once: Flash Buzz',
    text: 'Tap a Bee once to send a quick message or attach a photo!',
    icon: chatbubbleOutline
  },
  {
    title: 'Tap Twice: History',
    text: 'Double tap a Bee to view your past buzzing history and chat.',
    icon: timeOutline
  },
  {
    title: 'Tap 3x: Shockwave',
    text: 'Tap three times to send an intense vibration shockwave!',
    icon: flash
  },
  {
    title: 'Freedom of Flight',
    text: 'You can drag any bee around the screen to organize your hive however you like.',
    icon: add
  },
  {
    title: 'Expand the Colony',
    text: 'Use the FAB button at the bottom right to invite more bees to your hive.',
    icon: scanOutline
  }
];

const nextTutorialStep = () => {
    Haptics.impact({ style: ImpactStyle.Light });
    if (currentTutorialStep.value < tutorialSteps.length - 1) {
        currentTutorialStep.value++;
    } else {
        closeTutorial();
    }
};

const closeTutorial = () => {
    showTutorial.value = false;
    localStorage.setItem('notibee_tutorial_seen', 'true');
};
const { 
    updateStreak, getUserStreaks, getStreakCount 
} = useStreakService();

const startAudioRecording = async () => {
    try {
        const hasPermission = await requestMicPermission();
        if (!hasPermission) {
            const alert = await alertController.create({
                header: 'Microphone Required',
                message: 'NotiBee needs access to your microphone to send voice buzzes. Please enable it in your device settings.',
                buttons: [
                    { text: 'Cancel', role: 'cancel' },
                    { text: 'Settings', handler: () => {
                        (App as any).openSettings();
                    }}
                ]
            });
            await alert.present();
            return;
        }

        await Haptics.impact({ style: ImpactStyle.Medium });
        await startRecording();
    } catch (e) {
        console.error('Recording start failed', e);
        const toast = await toastController.create({
            message: 'Could not access microphone',
            duration: 2000,
            color: 'danger',
            position: 'top'
        });
        await toast.present();
    }
};

const cancelAudioRecording = async () => {
    await Haptics.selectionStart();
    cancelRecording();
};

const sendAudioRecording = async () => {
    if (!selectedBee.value) return;
    try {
        const blob = await stopRecording();
        const duration = recordingTime.value;
        
        await Haptics.impact({ style: ImpactStyle.Light });
        
        // Refocus input if in history mode to keep keyboard open
        if (isViewingHistory.value) {
            nextTick(() => {
                const textarea = document.querySelector('.chat-textarea textarea') as HTMLTextAreaElement;
                if (textarea) textarea.focus();
            });
        } else {
            // In buzz mode, close the modal on send
            isModalOpen.value = false;
        }

        // 1. Upload to storage
        const audioUrl = await uploadAudio(blob, userBeeId.value || 'unknown');
        
        // 2. Send buzz
        await sendAudioBuzz(
          selectedBee.value.beeId, 
          audioUrl, 
          duration, 
          userBeeId.value || '', 
          selectedBee.value.pushToken || ''
        );
        
        // Update streak
        updateStreak(userBeeId.value || '', selectedBee.value.beeId);
        
        if (isViewingHistory.value) {
          scrollToBottom();
        }
    } catch (e) {
        console.error('Failed to send audio', e);
    }
};

const router = useRouter();

const CACHE_KEY = 'hive_bee_states_v2';
const colonyIds = getFriends();
const pendingRequests = getPendingRequests();
const colonyBeesData = ref<any[]>([]);
const myBeeData = ref<any>(null);

// Try to load initial state from cache
const getCachedStates = (): BeeState[] => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    } catch { return []; }
};

const beeStates = ref<BeeState[]>(getCachedStates());
const buzzModal = ref<any>(null);
const historyList = ref<HTMLElement | null>(null);
const historyContentRef = ref<any>(null);
const isModalOpen = ref(false);
const isViewingHistory = ref(false);
const isRequestModalOpen = ref(false);
const isNotifModalOpen = ref(false);
const isGardenModalOpen = ref(false);
const isHeaderExpanded = ref(false);

const toggleHeader = () => {
    isHeaderExpanded.value = !isHeaderExpanded.value;
    Haptics.impact({ style: ImpactStyle.Light });
};
const hiddenBeeIds = ref<string[]>(JSON.parse(localStorage.getItem('hidden_garden_bees') || '[]'));

const toggleGardenBee = (beeId: string) => {
    if (hiddenBeeIds.value.includes(beeId)) {
        hiddenBeeIds.value = hiddenBeeIds.value.filter(id => id !== beeId);
    } else {
        hiddenBeeIds.value.push(beeId);
    }
    localStorage.setItem('hidden_garden_bees', JSON.stringify(hiddenBeeIds.value));
    Haptics.impact({ style: ImpactStyle.Light });
};

const isBeeVisible = (beeId: string) => !hiddenBeeIds.value.includes(beeId);

const gardenSearchQuery = ref('');
const filteredGardenBees = computed(() => {
    if (!gardenSearchQuery.value.trim()) return beeStates.value;
    const q = gardenSearchQuery.value.toLowerCase();
    return beeStates.value.filter(bee => 
        bee.beeId.toLowerCase().includes(q)
    );
});

const openNotificationsModal = () => {
    markAllAsRead();
    isNotifModalOpen.value = true;
    Haptics.impact({ style: ImpactStyle.Light });
};

const route = useRoute();
const selectedBee = ref<any>(null);
const quickMessage = ref('');
const selectedImage = ref<string | null>(null);
const isSending = ref(false);
const showSplash = ref(true);
const fullImage = ref<string | null>(null);
const userStreaksData = ref<any[]>([]);
let streaksUnsubscribe: (() => void) | null = null;

const commonEmojis = ['❤️', '😂', '😮', '😢', '🔥', '🐝', '👍', '🙏'];
const isEmojiPickerOpen = ref(false);
const emojiPickerEvent = ref<any>(null);
const selectedBuzzForReaction = ref<any>(null);
const confirmingDelete = ref(false);
const activeActionSheet = ref<any>(null);

const gardenActive = ref(false);

onIonViewWillEnter(async () => {
  gardenActive.value = false;
  
  // Reset specifically for Garden tab navigation as requested by user
  // BUT allow returning to specific tabs (like back from Room to Hub)
  const tabParam = route.query.tab as string;
  if (tabParam && ['hive', 'messages', 'hub'].includes(tabParam)) {
    activeTab.value = tabParam;
  } else {
    activeTab.value = 'hive';
  }
  
  isModalOpen.value = false;
  isViewingHistory.value = false;

  nextTick(() => {
    gardenActive.value = true;
  });

  // Force refresh my bee's customization from local storage for immediate update
  if (userBeeId.value) {
    const saved = localStorage.getItem('bee_customization');
    if (saved) {
      const selections = JSON.parse(saved);
      const me = beeStates.value.find(b => b.beeId === userBeeId.value);
      if (me) {
        me.customization = selections;
      }
    }
  }
});

const takePhoto = async () => {
    try {
        const image = await Camera.getPhoto({
            quality: 60, // Compress to 60%
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt, // Ask user: Camera or Gallery
            width: 800, // Max width 800px to keep firestore doc small
            height: 800
        });

        if (image.base64String) {
            selectedImage.value = `data:image/${image.format};base64,${image.base64String}`;
            Haptics.impact({ style: ImpactStyle.Light });
        }
    } catch (e: any) {
        console.warn('User cancelled or camera error', e);
        if (e.message !== 'User cancelled photos app') {
            const toast = await toastController.create({
                message: 'Could not access camera/gallery',
                duration: 2000,
                color: 'danger',
                position: 'top'
            });
            await toast.present();
        }
    }
};

const clearImage = () => {
    selectedImage.value = null;
    Haptics.impact({ style: ImpactStyle.Light });
};

const viewFullImage = (imageUrl: string) => {
    fullImage.value = imageUrl;
    Haptics.impact({ style: ImpactStyle.Medium });
};

const currentBeeHistory = computed(() => {
    if (!selectedBee.value) return [];
    return getBuzzesForBee(selectedBee.value.beeId).sort((a,b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
});

const handleRefresh = async (event: any) => {
    // Show splash for a manual refresh too for feedback
    showSplash.value = true;
    
    // Simulate sync/re-fetch delay
    setTimeout(() => {
        event.target.complete();
        showSplash.value = false;
        Haptics.notification({ type: 'success' as any });
    }, 1500);
};

const preloadBeeAssets = () => {
    const eyeAssets = [
        'angry', 'crying', 'dizzy', 'eh', 'hehe', 'hehehe', 
        'kawaii', 'meh', 'nonchalant', 'shock', 'smiley', 
        'square_eye', 'what', 'x_eye'
    ].map(eye => `/assets/bee assets/eyes/${eye}.png`);

    const assets = [
        '/assets/bee assets/wing_right.png',
        '/assets/bee assets/wing_left.png',
        '/assets/bee assets/bee_body.png',
        '/assets/bee assets/bee_eyes.png',
        '/assets/bee assets/eyeglass.png',
        '/assets/bee assets/shades.png',
        '/assets/bee assets/hat.png',
        '/assets/bee assets/cowboyhat.png',
        '/assets/bee assets/strawhat.png',
        '/assets/bee assets/crown.png',
        ...eyeAssets
    ];
    
    const promises = assets.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = resolve;
            img.onerror = resolve; // Continue even on error
        });
    });
    
    return Promise.all(promises);
};

// Auto-hide splash on initial load after a short delay
onMounted(async () => {
    // Clear any stuck bubbles from cache on load
    beeStates.value.forEach(b => {
        b.lastMessage = undefined;
        b.lastMessageId = undefined;
    });

    const startTime = Date.now();
    
    // Preload assets and wait at least 2000ms for premium feel and complete load
    await preloadBeeAssets();
    
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 2000 - elapsed);
    
    setTimeout(() => {
        showSplash.value = false;
    }, remaining);
    
    // Initialize streak tracking
    if (userBeeId.value) {
        const { streaks, unsubscribe } = getUserStreaks(userBeeId.value);
        streaksUnsubscribe = unsubscribe;
        watch(streaks, (data) => {
            userStreaksData.value = data;
        }, { immediate: true });

        // Show tutorial if first time
        const tutorialSeen = localStorage.getItem('notibee_tutorial_seen');
        if (!tutorialSeen) {
            setTimeout(() => {
                showTutorial.value = true;
            }, 2500);
        }

        // Init Daily Login
        initDailyLogin();
    }
});

const presets = ['Honey is ready! 🍯', 'Emergency! 🚨', 'Check the Hive 🐝', 'Where are you?', 'Buzz! ⚡️'];

const isSearchModalOpen = ref(false);
const searchId = ref('');
const { getRecipientToken } = useUserService();

const openSearchModal = () => {
    searchId.value = '';
    isSearchModalOpen.value = true;
    Haptics.impact({ style: ImpactStyle.Light });
};

const handleFindBee = async () => {
    if (!searchId.value) return;
    
    // Check if ID is self
    if (searchId.value === userBeeId.value) {
        const toast = await toastController.create({
            message: "You're already in the Hive! 🐝",
            duration: 2000,
            color: 'warning',
            position: 'top'
        });
        await toast.present();
        return;
    }

    try {
        const result = await getRecipientToken(searchId.value);
        if (result.exists) {
            isSearchModalOpen.value = false;
            // Add to friends in Firestore
            await addFriend(searchId.value);
            // Open buzz modal for this ID
            selectedBee.value = { 
                beeId: searchId.value,
                pushToken: result.token
            };
            quickMessage.value = '';
            isModalOpen.value = true;
        } else {
            const alert = await alertController.create({
                header: 'Bee Not Found',
                message: `The ID "${searchId.value}" hasn't joined the Hive yet.`,
                buttons: ['OK']
            });
            await alert.present();
        }
    } catch (e) {
        console.error(e);
    }
};

const handleScan = async () => {
    // Ensure the ML Kit module is installed on Android
    try {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
    } catch (e) {
        console.warn('ML Kit module installation skipped or failed', e);
    }

    let { camera } = await BarcodeScanner.checkPermissions();
    
    // If not granted, request it
    if (camera !== 'granted') {
        const { camera: newStatus } = await BarcodeScanner.requestPermissions();
        camera = newStatus;
    }

    // If still not granted (denied by user or blocked), show instructions
    if (camera !== 'granted') {
        const alert = await alertController.create({
            header: 'Camera Required 📸',
            message: 'NotiBee needs access to your camera to scan QR codes. Please enable it in your device settings.',
            buttons: [
                { text: 'Cancel', role: 'cancel' },
                { text: 'Settings', handler: () => {
                    (App as any).openSettings();
                }}
            ]
        });
        await alert.present();
        return;
    }

    try {
        isSearchModalOpen.value = false;
        document.body.classList.add('barcode-scanner-active');

        const { barcodes } = await BarcodeScanner.scan({
            formats: [BarcodeFormat.QrCode]
        });

        if (barcodes.length > 0) {
            const scannedId = barcodes[0].displayValue;
            if (scannedId) {
                searchId.value = scannedId;
                Haptics.notification({ type: 'success' as any });
                handleFindBee();
            }
        }
    } catch (e) {
        console.error('Scan failed', e);
    } finally {
        document.body.classList.remove('barcode-scanner-active');
    }
};

const handleAcceptRequest = async (id: string) => {
    try {
        await acceptFriendRequest(id);
        const toast = await toastController.create({
            message: `${id} has successfully joined your Nest! 🍯`,
            duration: 2000,
            color: 'primary',
            position: 'top'
        });
        await toast.present();
        Haptics.notification({ type: 'success' as any });
    } catch (e) {
        console.error(e);
    }
};

const handleRejectRequest = async (id: string) => {
    try {
        await rejectFriendRequest(id);
    } catch (e) {
        console.error(e);
    }
};

const truncateMessage = (msg: string) => {
    return msg.length > 30 ? msg.substring(0, 27) + '...' : msg;
};

const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastActive = new Date(lastSeen).getTime();
    const now = Date.now();
    return (now - lastActive) < 1000 * 60 * 1; // Online if seen in last 1 min
};

const getOfflineDuration = (lastSeen?: string): string => {
    if (!lastSeen) return 'Offline';
    
    const lastActive = new Date(lastSeen).getTime();
    const now = Date.now();
    const diff = now - lastActive;
    const seconds = Math.floor(diff / 1000);
    
    // If online (within 1 minute), return 'Online'
    if (seconds < 60) return 'Online';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Offline ${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Offline ${hours}h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `Offline ${days}d`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `Offline ${weeks}w`;
    
    const months = Math.floor(days / 30);
    return `Offline ${months}mo`;
};


const myCustomization = computed(() => {
    const stored = localStorage.getItem('bee_customization');
    if (stored) return JSON.parse(stored);
    return { top: 'none', body: 'none', eyes: 'none' };
});
const dynamicBeeScale = computed(() => {
  const count = beeStates.value.length || 1;
  if (count <= 3) return 1.5; // Large for small crowds
  if (count <= 8) return 1.2; // Medium-large
  if (count >= 20) return 0.8; // Smaller for big swarms
  return 1.0; // Standard size
});

const getRandomPos = () => {
    const scale = dynamicBeeScale.value;
    const padding = 60 * scale;
    return {
        x: Math.random() * (window.innerWidth - (padding * 2)) + padding,
        y: Math.random() * (window.innerHeight - 150)
    };
};

const animateBees = () => {
    // Update in-place to preserve reactivity for lastMessage bubbles
    beeStates.value.forEach(bee => {
        if (bee.isDragging) return; 
        const pos = getRandomPos();
        
        // Flip logic: if new X is less than current X, it's moving left
        bee.isFlipped = pos.x < bee.x;
        
        bee.x = pos.x;
        bee.y = pos.y;
        bee.speed = 3000 + Math.random() * 4000;
    });
};

let animationTimer: any = null;

let colonyUnsubscribe: (() => void) | null = null;
let myUnsubscribe: (() => void) | null = null;

// Watch for colony changes and setup listeners
watch(colonyIds, (newIds) => {
    if (colonyUnsubscribe) colonyUnsubscribe();
    if (newIds.length > 0) {
        const { members, unsubscribe } = getColonyMembers(newIds);
        colonyUnsubscribe = unsubscribe;
        // Connect the returned ref to our local ref
        watch(members, (data) => {
            colonyBeesData.value = data;
        }, { immediate: true });
    } else {
        colonyBeesData.value = [];
    }
}, { immediate: true });

// Specifically watch the current user's record
// Daily Login logic
const { initLoginData, isClaimedToday: isDailyClaimed } = useDailyLoginService();
const isDailyLoginOpen = ref(false);

const initDailyLogin = async () => {
    await initLoginData();
    if (!isDailyClaimed.value) {
        setTimeout(() => {
            isDailyLoginOpen.value = true;
        }, 3500); // Show after splash and initial animations
    }
};
watch(userBeeId, (id) => {
    if (myUnsubscribe) myUnsubscribe();
    if (id) {
        const { members, unsubscribe } = getColonyMembers([id]);
        myUnsubscribe = unsubscribe;
        watch(members, (data) => {
            if (data.length > 0) myBeeData.value = data[0];
        }, { immediate: true });
    }
}, { immediate: true });

  // Combine data for the animation engine
watch([colonyBeesData, myBeeData, userBeeId], ([colonyData, me, myId]) => {
  // 1. Update existing bee data (status, token) from Firestore
  colonyData.forEach(bee => {
    const existing = beeStates.value.find(b => b.beeId === bee.beeId);
    if (existing) {
        existing.isOnline = isOnline(bee.lastSeen);
        existing.lastSeen = bee.lastSeen;
        if (bee.pushToken) existing.pushToken = bee.pushToken;
        if (bee.customization) existing.customization = bee.customization;
    }
  });

  if (me && myId) {
    const existingMe = beeStates.value.find(b => b.beeId === myId);
    if (existingMe) {
        existingMe.isOnline = true;
        if (me.pushToken) existingMe.pushToken = me.pushToken;
        
        // Use Firestore if it has it, else fallback to localStorage
        if (me.customization) {
            existingMe.customization = me.customization;
        } else {
            const saved = localStorage.getItem('bee_customization');
            if (saved) existingMe.customization = JSON.parse(saved);
        }
    }
  }

  // 2. Add missing bees that are in colonyIds but not in beeStates
  [...colonyIds.value, myId].forEach(id => {
    if (!id) return;
    const existing = beeStates.value.find(b => b.beeId === id);
    if (!existing) {
      const pos = getRandomPos();
      const rawBee = [...colonyBeesData.value, myBeeData.value].find(b => b?.beeId === id);
      
      let initialCustom = rawBee?.customization;
      if (!initialCustom && id === myId) {
          const saved = localStorage.getItem('bee_customization');
          if (saved) initialCustom = JSON.parse(saved);
      }

      beeStates.value.push({
        beeId: id,
        isOnline: id === myId,
        lastSeen: rawBee?.lastSeen,
        pushToken: rawBee?.pushToken,
        x: pos.x,
        y: pos.y,
        speed: 4000 + Math.random() * 3000,
        isDragging: false,
        customization: initialCustom
      });
    }
  });

  // 3. Remove bees that are no longer in colonyIds AND not me
  // Wait until colonyIds has been fetched (if it's empty, we might still be loading)
  const validIds = [myId, ...colonyIds.value];
  if (validIds.length > 1 || (myId && colonyIds.value.length === 0)) {
      const currentIds = beeStates.value.map(b => b.beeId);
      const hasRemovals = currentIds.some(id => !validIds.includes(id));
      if (hasRemovals) {
          beeStates.value = beeStates.value.filter(b => validIds.includes(b.beeId));
      }
  }

  // Save to cache (exclude ephemeral bubble data)
  const statesToCache = beeStates.value.map(s => ({
    ...s,
    lastMessage: undefined,
    lastMessageId: undefined
  }));
  localStorage.setItem(CACHE_KEY, JSON.stringify(statesToCache));
}, { immediate: true, deep: true });

const scrollToBottom = async (duration = 300) => {
    // Wait for initial ticks
    await nextTick();
    await nextTick();
    
    const effort = async (d: number) => {
        if (historyContentRef.value) {
            const content = historyContentRef.value;
            try {
                // Best way: use Ionic's built-in scrollToBottom
                if (typeof content.scrollToBottom === 'function') {
                    await content.scrollToBottom(d);
                } else if (typeof content.scrollToPoint === 'function') {
                    // Fallback to scrollToPoint with a relative huge Y to force bottom
                    await content.scrollToPoint(0, 999999, d);
                } else if (content.$el && typeof content.$el.scrollToBottom === 'function') {
                    await content.$el.scrollToBottom(d);
                }
                
                // Direct DOM manipulation as last resort
                const el = await content.getScrollElement();
                if (el) {
                    el.scrollTop = el.scrollHeight;
                }
            } catch (err) {
                // Silence errors during transition
            }
        }
    };

    // 1. Initial attempt
    await effort(duration);
    
    // 2. Persistent retries for modal/rendering delay
    // Multiple intervals ensure we catch the height change when images/messages render
    // Transitions can take up to 400ms, and image loads even longer
    [50, 150, 300, 500, 800, 1200].forEach(delay => {
        setTimeout(() => effort(delay < 400 ? 0 : duration), delay);
    });
};

// Watch for history view opening to scroll
watch(isViewingHistory, (isViewing) => {
    if (isViewing) {
        scrollToBottom();
    }
});

// Watch for new messages in the currently selected bee's history
// Watch for new messages in the currently selected bee's history
watch(() => currentBeeHistory.value.length, () => {
    if (isViewingHistory.value) {
        scrollToBottom();
        
        // Mark new messages as read immediately if we are looking at them
        if (selectedBee.value) {
            const lastMsg = currentBeeHistory.value[currentBeeHistory.value.length - 1];
            if (lastMsg && lastMsg.sender === selectedBee.value.beeId) {
                sendReadReceipt(selectedBee.value.beeId, lastMsg.id, userBeeId.value!);
            }
        }
    }
});

// Watch for deep linking from notifications
watch(() => route.query.openBee, (beeId) => {
    if (saveHistoryEnabled.value && beeId && typeof beeId === 'string') {
        // Wait for bees to load if necessary
        nextTick(() => {
            const bee = beeStates.value.find(b => b.beeId === beeId);
            if (bee) {
                openBuzzModal(bee);
                // Force history view after modal opens
                setTimeout(() => {
                    isViewingHistory.value = true;
                    if (buzzModal.value) {
                         buzzModal.value.$el.setCurrentBreakpoint(1);
                    }
                }, 100);
            }
        });
    }
}, { immediate: true });

// Watch for received or sent buzzes to show bubbles on the sender/you
watch(buzzes, (newBuzzes) => {
    if (newBuzzes.length === 0) return;
    const latest = newBuzzes[0];
    
    // Only show bubble if message is very recent (arrived in last 10 seconds)
    // This prevents old messages from popping bubbles on page load or sync
    const now = Date.now();
    const messageTime = new Date(latest.timestamp).getTime();
    const messageAge = now - messageTime;
    
    // Debug log to help track delivery issues
    
    if (messageAge > 10000) return;

    // Exclude room buzzes from hive bubbles
    if (latest.type === 'ROOM_BUZZ' || latest.type === 'ROOM_BUZZ_AUDIO') return;

    const bee = beeStates.value.find(b => b.beeId === latest.sender);
    if (bee) {
        bee.lastMessage = latest.message;
        bee.lastMessageId = latest.id;
        
        // Hide after 15 seconds
        setTimeout(() => {
            if (bee.lastMessageId === latest.id) {
                bee.lastMessage = undefined;
                bee.lastMessageId = undefined;
            }
        }, 15000);
    }
}, { deep: true });

watch(showSplash, (isShowing) => {
    if (!isShowing) {
        if (animationTimer) clearInterval(animationTimer);
        animationTimer = setInterval(animateBees, 4000);
        setTimeout(animateBees, 100);
    }
});

let statusTimer: any = null;

onMounted(async () => {
  // Sync my bee profile for the talking bee feature
  if (userBeeId.value) {
      const profile = await useUserService().getUserProfile(userBeeId.value);
      if (profile?.customization) {
          localStorage.setItem('bee_customization', JSON.stringify(profile.customization));
      }
  }

  // Bee animations are now triggered by the showSplash watcher to ensure 
  // assets are fully ready before bees take flight.

  // Check for first installation / tutorial
  const tutorialSeen = localStorage.getItem('notibee_tutorial_seen');
  if (!tutorialSeen) {
    setTimeout(() => {
      showTutorial.value = true;
    }, 2000);
  }

  // Heartbeat to update online status real-time every 10s
  statusTimer = setInterval(() => {
      beeStates.value.forEach(bee => {
          const rawBee = [...colonyBeesData.value, myBeeData.value].find(b => b?.beeId === bee.beeId);
          if (rawBee) {
              bee.isOnline = bee.beeId === userBeeId.value ? true : isOnline(rawBee.lastSeen);
              bee.lastSeen = rawBee.lastSeen;
          }
      });
  }, 10000);

  // Add global move listeners for dragging
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('touchend', onDragEnd);
});

onUnmounted(() => {
  if (animationTimer) clearInterval(animationTimer);
  if (statusTimer) clearInterval(statusTimer);
  if (colonyUnsubscribe) colonyUnsubscribe();
  if (myUnsubscribe) myUnsubscribe();
  if (streaksUnsubscribe) streaksUnsubscribe();

  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
  window.removeEventListener('touchmove', onDragMove);
  window.removeEventListener('touchend', onDragEnd);
});

const openBuzzModal = (bee: any, wantHistory = false) => {
  if (isLongPressTriggered.value) {
      isLongPressTriggered.value = false;
      return;
  }
  
  // Clear the bubble message when clicked (user is acknowledging/replying)
  bee.lastMessage = undefined;
  
  // Clear local unread count
  clearUnread(bee.beeId);
  
  selectedBee.value = bee;
  quickMessage.value = '';
  isViewingHistory.value = wantHistory;
  isModalOpen.value = true;
  
  if (wantHistory) {
    nextTick(() => {
        if (buzzModal.value) {
            const targetBreakpoint = activeTab.value === 'messages' ? 1 : 1; // Both are 1 but kept for clarity if logic changes
            buzzModal.value.$el.setCurrentBreakpoint(targetBreakpoint);
        }
        // Additional delayed scroll for safety when opening history
        setTimeout(() => scrollToBottom(0), 400);
    });
  }

  Haptics.impact({ style: ImpactStyle.Light });

  // Send Read Receipt for the last message from them
  if (wantHistory || activeTab.value === 'messages') {
     nextTick(() => {
        const history = getBuzzesForBee(bee.beeId);
        const lastFromThem = [...history].reverse().find(b => b.sender === bee.beeId);
        if (lastFromThem) {
           sendReadReceipt(bee.beeId, lastFromThem.id, userBeeId.value!);
        }
     });
  }
};

let clickTimer: any = null;
let clickCount = 0;

const getBeeCustomization = (beeId: string) => {
    const bee = beeStates.value.find(b => b.beeId === beeId);
    if (bee?.customization) return bee.customization;
    return { top: 'none', body: 'none' };
};

const handleBeeClick = (bee: any) => {
    if (hasDragged.value || bee.beeId === userBeeId.value) return; 
    clickCount++;
    
    if (clickTimer) clearTimeout(clickTimer);
    
    clickTimer = setTimeout(() => {
        if (clickCount === 1) {
            // 1 tap - Open Modal / Flash Buzz
            openBuzzModal(bee, false);
        } else if (clickCount === 2) {
            // 2 tap - Open Modal History
            openBuzzModal(bee, true);
        } else if (clickCount >= 3) {
            // 3 tap - Sends buzz! (Shockwave)
            triggerVibration(bee);
        }
        clickCount = 0;
    }, 400); // 400ms window for multitap
};

const triggerVibration = async (bee: any) => {
    if (bee.beeId === userBeeId.value) return;

    try {
        await sendVibrate(bee.beeId, userBeeId.value!, bee.pushToken);
        Haptics.impact({ style: ImpactStyle.Heavy });
        
        const toast = await toastController.create({
            message: `Sent a shockwave to ${bee.beeId}! ⚡`,
            duration: 1500,
            color: 'primary',
            position: 'top'
        });
        await toast.present();
    } catch (e) {
        console.error('Vibrate failed:', e);
    }
};

const handleSegmentChange = (e: any) => {
    const val = e.detail.value;
    const isHistory = val === 'history';
    
    if (isViewingHistory.value === isHistory) return;
    
    isViewingHistory.value = isHistory;
    
    // Smoothly expand to full screen if opening history
    if (buzzModal.value) {
        const target = isHistory ? 1 : 0.85;
        buzzModal.value.$el.setCurrentBreakpoint(target);
    }

    Haptics.impact({ style: ImpactStyle.Light });
};

const toggleHistoryView = () => {
    const newVal = !isViewingHistory.value;
    handleSegmentChange({ detail: { value: newVal ? 'history' : 'buzz' } });
};

const longPressTimer = ref<any>(null);
const isLongPressTriggered = ref(false);

const startLongPress = (bee: any) => {
    isLongPressTriggered.value = false;
    endLongPress(); // Clear any existing
    longPressTimer.value = setTimeout(() => {
        isLongPressTriggered.value = true;
        handleBeeLongPress(bee);
    }, 600); // 600ms for long press
};

const endLongPress = () => {
    if (longPressTimer.value) {
        clearTimeout(longPressTimer.value);
        longPressTimer.value = null;
    }
};

// Dragging Logic
const draggedBee = ref<BeeState | null>(null);
const dragOffset = ref({ x: 0, y: 0 });
const hasDragged = ref(false);
const dragThreshold = 5; // pixels

const onDragStart = (e: any, bee: BeeState) => {
    if (bee.beeId === userBeeId.value) return; 
    
    // Only start long press if not already dragging or about to drag
    startLongPress(bee);
    
    draggedBee.value = bee;
    hasDragged.value = false;
    
    // Capture current visual position (prevents teleporting if caught mid-flight)
    const el = e.currentTarget as HTMLElement;
    const style = window.getComputedStyle(el);
    const matrix = new WebKitCSSMatrix(style.transform);
    
    // Update logically to current visual position before disabling transition
    bee.x = matrix.m41;
    bee.y = matrix.m42;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    dragOffset.value = {
        x: clientX - bee.x,
        y: clientY - bee.y
    };
    
    // Disable animation while dragging
    bee.isDragging = true;
};

const onDragMove = (e: any) => {
    if (!draggedBee.value) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    const newX = clientX - dragOffset.value.x;
    const newY = clientY - dragOffset.value.y;
    
    // Check if we passed the drag threshold to prevent misfires with clicks
    if (!hasDragged.value) {
        const dist = Math.sqrt(Math.pow(newX - draggedBee.value.x, 2) + Math.pow(newY - draggedBee.value.y, 2));
        if (dist > dragThreshold) {
            hasDragged.value = true;
            endLongPress(); // Cancel long press if we moved significantly
        }
    }
    
    if (hasDragged.value) {
        if (e.cancelable) e.preventDefault();
        draggedBee.value.x = newX;
        draggedBee.value.y = newY;
    }
};

const onDragEnd = () => {
    if (draggedBee.value) {
        draggedBee.value.isDragging = false;
    }
    draggedBee.value = null;
    endLongPress();
};

const handleBeeLongPress = async (bee: any) => {
    // End any lingering press timers prevents double triggers if user holds too long
    endLongPress();
    
    if (bee.beeId === userBeeId.value) return; // Can't delete yourself

    Haptics.impact({ style: ImpactStyle.Medium });

    const actionSheet = await actionSheetController.create({
        header: `Manage ${bee.beeId}`,
        buttons: [
            {
                text: 'Unfriend',
                role: 'destructive',
                icon: trash,
                handler: () => {
                   confirmDelete(bee.beeId);
                }
            },
            {
                text: 'Cancel',
                role: 'cancel',
                icon: closeOutline
            }
        ],
        cssClass: 'nest-action-sheet'
    });
    await actionSheet.present();
};

const confirmDelete = async (id: string) => {
    const alert = await alertController.create({
        header: 'Remove Bee?',
        message: `Are you sure you want to remove ${id} from your Nest?`,
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            { 
                text: 'Remove', 
                handler: async () => {
                    await removeFriend(id);
                    const toast = await toastController.create({
                        message: `${id} has left the Nest.`,
                        duration: 2000,
                        color: 'medium',
                        position: 'top'
                    });
                    await toast.present();
                } 
            }
        ]
    });
    await alert.present();
};

const showReactionPicker = (buzz: any, event: any) => {
  selectedBuzzForReaction.value = buzz;
  emojiPickerEvent.value = event;
  isEmojiPickerOpen.value = true;
  Haptics.impact({ style: ImpactStyle.Light });
};

const handleMessageLongPress = async (buzz: any, event: any) => {
    Haptics.impact({ style: ImpactStyle.Medium });
    
    // Show the bubble for reactions and delete option
    showReactionPicker(buzz, event);
};

const handleFlashBuzzLongPress = async (bee: any) => {
    Haptics.impact({ style: ImpactStyle.Medium });
    const actionSheet = await actionSheetController.create({
        header: `Buzz from ${bee.beeId}`,
        buttons: [
            {
                text: 'Dismiss Bubble',
                icon: closeOutline,
                handler: () => {
                   bee.lastMessage = undefined;
                   bee.lastMessageId = undefined;
                   Haptics.impact({ style: ImpactStyle.Light });
                }
            },
            {
                text: 'Delete Thread',
                role: 'destructive',
                icon: trash,
                handler: () => {
                    confirmClearConversation(bee.beeId);
                }
            },
            {
                text: 'Cancel',
                role: 'cancel',
                icon: closeOutline
            }
        ],
        cssClass: 'nest-action-sheet'
    });
    await actionSheet.present();
};

const handleConvoLongPress = async (convo: any) => {
    Haptics.impact({ style: ImpactStyle.Medium });
    const actionSheet = await actionSheetController.create({
        header: `Manage Buzz with ${convo.beeId}`,
        buttons: [
            {
                text: 'Delete Conversation',
                role: 'destructive',
                icon: trash,
                handler: () => {
                    confirmClearConversation(convo.beeId);
                }
            },
            {
                text: 'Cancel',
                role: 'cancel',
                icon: closeOutline
            }
        ],
        cssClass: 'nest-action-sheet'
    });
    await actionSheet.present();
};

const confirmClearConversation = async (beeId: string) => {
    const alert = await alertController.create({
        header: 'Delete Conversation?',
        message: `This will permanently remove your local chat history with ${beeId}.`,
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            { 
                text: 'Delete', 
                handler: () => {
                    deleteConversation(beeId);
                    Haptics.notification({ type: 'success' as any });
                } 
            }
        ]
    });
    await alert.present();
};

const confirmDeleteBuzz = async () => {
    if (!selectedBuzzForReaction.value) return;
    confirmingDelete.value = true;
    const msgId = selectedBuzzForReaction.value.id;
    isEmojiPickerOpen.value = false;
    
    const alert = await alertController.create({
        header: 'Delete Message?',
        message: 'This will remove this message from your local history.',
        buttons: [
            {
                text: 'Cancel', 
                role: 'cancel', 
                handler: () => {
                    confirmingDelete.value = false;
                    selectedBuzzForReaction.value = null;
                }
            },
            { 
                text: 'Delete', 
                handler: () => {
                   deleteBuzz(msgId);
                   confirmingDelete.value = false;
                   selectedBuzzForReaction.value = null;
                   Haptics.notification({ type: 'success' as any });
                } 
            }
        ]
    });
    await alert.present();
};

const handleEmojiSelect = (emoji: string) => {
  if (selectedBuzzForReaction.value && selectedBee.value) {
    reactToBuzz(selectedBuzzForReaction.value, emoji);
  }
  isEmojiPickerOpen.value = false;
  if (activeActionSheet.value) {
    activeActionSheet.value.dismiss();
    activeActionSheet.value = null;
  }
};

const reactToBuzz = async (buzz: any, emoji: string) => {
  if (!selectedBee.value) return;
  try {
    await sendBuzzReaction(selectedBee.value.beeId, buzz.id, emoji, userBeeId.value!);
    Haptics.impact({ style: ImpactStyle.Light });
  } catch (err) {
    console.error('failed to react', err);
  }
};

const lastMessageClickRef = ref<{ id: string, time: number } | null>(null);

const handleMessageClick = (buzz: any) => {
  const now = Date.now();
  if (lastMessageClickRef.value && lastMessageClickRef.value.id === buzz.id && (now - lastMessageClickRef.value.time) < 300) {
    // Double tap
    reactToBuzz(buzz, '❤️');
    lastMessageClickRef.value = null;
  } else {
    lastMessageClickRef.value = { id: buzz.id, time: now };
  }
};

const handleSendBuzz = async () => {
    if (!quickMessage.value.trim() && !selectedImage.value) return;
    
    const message = quickMessage.value || (selectedImage.value ? 'Sent an image' : 'Buzz! 🐝');
    const targetId = selectedBee.value.beeId;
    const imageToSend = selectedImage.value || undefined;
    
    // Clear inputs immediately
    quickMessage.value = '';
    selectedImage.value = null;

    // Refocus input if in history mode to keep keyboard open
    if (isViewingHistory.value) {
        nextTick(() => {
            const textarea = document.querySelector('.chat-textarea textarea') as HTMLTextAreaElement;
            if (textarea) textarea.focus();
        });
    } else {
        // In buzz mode, close the modal on send
        isModalOpen.value = false;
    }

    try {
        await sendBuzz(
            targetId, 
            message, 
            userBeeId.value || 'Anonymous Bee',
            selectedBee.value.pushToken || '',
            imageToSend
        );
        
        // Update streak after successful buzz
        if (userBeeId.value && targetId !== userBeeId.value) {
            updateStreak(userBeeId.value, targetId);
        }
        
        Haptics.impact({ style: ImpactStyle.Light });
        if (isViewingHistory.value) {
            scrollToBottom();
        }
    } catch (e: any) {
        console.error('Buzz failed', e);
    }
};

// Get streak count for a specific bee
const getStreakForBee = (friendId: string): number => {
    const streak = userStreaksData.value.find(s => s.friendId === friendId);
    return streak?.currentStreak || 0;
};

// Get longest streak for a specific bee
const getLongestStreakForBee = (friendId: string): number => {
    const streak = userStreaksData.value.find(s => s.friendId === friendId);
    return streak?.longestStreak || 0;
};

// Navigation to profile
const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
};

const goToProfile = (beeId: string | undefined | null) => {
    if (!beeId) return;
    isModalOpen.value = false;
    setTimeout(() => {
        router.push(`/tabs/profile/${beeId}`);
    }, 100);
};

const handleVoiceCall = async () => {
    if (!selectedBee.value?.beeId) return;
    try {
        await startCall(selectedBee.value.beeId);
        isModalOpen.value = false;
        router.push('/call');
    } catch (e) {
        console.error('Call failed:', e);
    }
};


const getNotifEmoji = (type: string) => {
    switch(type) {
        case 'BUZZ': return '⚡';
        case 'VIBRATE': return '🫨';
        case 'FRIEND_REQUEST': return '🐝';
        case 'AUDIO': return '🎙️';
        case 'ROOM_BUZZ': return '🚪';
        case 'REACTION': return '❤️';
        case 'MISSED_CALL': return '📞';
        case 'STREAK': return '🔥';
        case 'ACHIEVEMENT': return '🏆';
        case 'UPDATE': return '🚀';
        default: return '🔔';
    }
};

const handleNotifClick = (notif: any) => {
    markAsRead(notif.id);
    isNotifModalOpen.value = false;

    if (notif.type === 'FRIEND_REQUEST') {
        isRequestModalOpen.value = true;
    } else if (notif.type === 'MISSED_CALL') {
        router.push('/call');
    } else if (notif.type === 'STREAK') {
        router.push(`/tabs/profile/${notif.from}`);
    } else if (notif.type === 'ACHIEVEMENT') {
        router.push('/tabs/achievements');
    } else if (notif.type === 'UPDATE') {
        router.push('/tabs/tab3');
    }
    
    Haptics.impact({ style: ImpactStyle.Light });
};
</script>

<style scoped>
.hive-content {
  --background: var(--ion-background-color);
}

.main-segment-wrapper {
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 20px 10px;
  position: sticky;
  top: 0;
  z-index: 1000;
  background: transparent;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(255, 191, 0, 0.05);
}

.main-nav-segment {
  --background: rgba(255, 255, 255, 0.03);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.02);
}

.main-nav-segment ion-segment-button {
  --indicator-color: var(--ion-color-primary);
  --color: rgba(255, 255, 255, 0.4);
  --color-checked: #000;
  font-weight: 800;
  letter-spacing: 1.5px;
  min-height: 42px;
  position: relative;
  --background-checked: var(--ion-color-primary);
  --border-radius: 12px;
  margin: 0 2px;
}

.tab-unread-badge {
  position: absolute;
  top: 4px;
  right: 12px;
  background: #ff3b30;
  color: white;
  font-size: 10px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  border: 2px solid var(--ion-background-color);
}

/* Messages Tab Styles */
.messages-tab-container {
  padding: 0 clamp(12px, 4vw, 20px) 100px;
  min-height: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.hub-tab-container {
  min-height: 100%;
  padding-bottom: 100px;
}

.messages-header {
  margin-bottom: 20px;
}

.search-bar-inline {
  display: flex;
  align-items: center;
  padding: 0 15px;
  height: 48px;
  border-radius: 15px;
  gap: 10px;
}

.search-bar-inline ion-icon {
  color: #666;
  font-size: 20px;
}

.search-bar-inline input {
  background: transparent;
  border: none;
  color: white;
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  outline: none;
}

.convo-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.convo-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.2s;
}

.convo-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.convo-avatar {
  position: relative;
  width: 54px;
  height: 54px;
}

.hex-mini {
  width: 100%;
  height: 100%;
  background: var(--ion-color-primary);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
  pointer-events: none;
}

.online-status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: #2dd36f;
  border-radius: 50%;
  border: 3px solid var(--ion-background-color);
}

.convo-info {
  flex: 1;
  min-width: 0;
}

.convo-top-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.convo-name {
  font-weight: 800;
  font-size: clamp(0.95rem, 4.5vw, 1.1rem);
  color: white;
}

.convo-time {
  font-size: 11px;
  color: #666;
}

.convo-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-msg {
  margin: 0;
  font-size: clamp(0.8rem, 3.5vw, 0.9rem);
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.last-msg.unread {
  color: white;
  font-weight: 700;
}

.unread-dot {
  width: 10px;
  height: 10px;
  background: var(--ion-color-primary);
  border-radius: 50%;
  margin-left: 10px;
  box-shadow: 0 0 10px rgba(255, 191, 0, 0.5);
}

.empty-messages-state {
  text-align: center;
  padding: clamp(40px, 15vh, 80px) 20px;
}

.empty-messages-state h3 {
  margin: 15px 0 5px;
  font-weight: 800;
}

.empty-messages-state p {
  color: #666;
  font-size: 14px;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.hive-background {
  position: relative;
  width: 100%;
  height: calc(100vh - 120px);
  overflow: hidden;
  background-color: var(--ion-background-color);
  /* Plane Hexagon Pattern */
  background-image: 
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%23ffbf00' stroke-opacity='0.12' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 56px 100px;
  background-repeat: repeat;
}

.hive-header {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + clamp(70px, 15vw, 90px));
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0 clamp(12px, 4vw, 16px);
  display: flex;
  justify-content: flex-end; /* Align buttons to the right */
  align-items: center;
  pointer-events: none;
}

.header-right {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  /* Ensure transform origin is center for the squash effect */
  transform-origin: center top;
}

.toggle-btn {
  background: rgba(255, 191, 0, 0.1) !important;
  border-color: rgba(255, 191, 0, 0.3) !important;
}

.toggle-icon {
  font-size: 20px;
  color: var(--ion-color-primary);
  transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.collapsible-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.3s ease;
  opacity: 0;
  width: 100%;
}

.collapsible-wrapper.is-expanded {
  grid-template-rows: 1fr;
  opacity: 1;
}

.collapsible-inner {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

/* Stretch and Squash Animation */
.header-squash {
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes squash-stretch {
  0% { transform: scale(1, 1); }
  25% { transform: scale(1.1, 0.85); }
  50% { transform: scale(0.9, 1.15); }
  75% { transform: scale(1.05, 0.95); }
  100% { transform: scale(1, 1); }
}

.is-expanded + .toggle-btn {
  animation: squash-stretch 0.6s ease;
}

.secondary-btn {
  transform: scale(0.8);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.is-expanded .secondary-btn {
  transform: scale(1);
  opacity: 1;
}
.nest-notif-btn {
  width: 44px;
  height: 44px;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.nest-notif-btn:active {
  transform: scale(0.9);
  background: rgba(255, 191, 0, 0.1);
}

.nest-notif-btn .emoji {
  font-size: 24px;
}

.notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--ion-color-primary);
  color: black;
  font-size: 10px;
  font-weight: 900;
  min-width: 18px;
  height: 18px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid black;
}

/* Atmospheric Breath Effect */
.hive-background::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255, 191, 0, 0.15), transparent 70%);
  animation: light-breath 8s infinite ease-in-out;
  pointer-events: none;
}

@keyframes light-breath {
  0%, 100% { 
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% { 
    opacity: 1;
    transform: scale(1.1);
  }
}

.flying-bee {
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
  z-index: 10;
  will-change: transform;
  animation: bee-fade-in 0.8s ease-out forwards;
}

@keyframes bee-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.bee-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bee-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 50px;
  height: 50px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.bee-juicy {
  animation: bee-squash-stretch 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes bee-squash-stretch {
  0% { transform: scale(1); }
  20% { transform: scale(1.4, 0.6); }
  40% { transform: scale(0.7, 1.3); }
  60% { transform: scale(1.1, 0.9); }
  80% { transform: scale(0.95, 1.05); }
  100% { transform: scale(1); }
}

.bee-icon-composite {
  position: absolute !important;
  pointer-events: none;
  /* Centering the 220px box in the 50px parent */
  left: 50%;
  top: 50%;
  margin-left: -110px;
  margin-top: -110px;
}

/* Streak Badge */
.streak-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #ff6b35, #ff9500);
  border-radius: 12px;
  padding: 2px 6px;
  display: flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.3);
  animation: streakGlow 2s ease-in-out infinite;
  z-index: 10;
}

.streak-fire {
  font-size: 12px;
  animation: flicker 1.5s infinite;
}

.streak-count {
  font-size: 10px;
  font-weight: 800;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

@keyframes streakGlow {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(255, 107, 53, 0.6);
  }
  50% {
    box-shadow: 0 2px 16px rgba(255, 107, 53, 0.9), 0 0 20px rgba(255, 149, 0, 0.5);
  }
}

@keyframes flicker {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

.bee-name-tag {
  position: absolute;
  top: 100%;
  left: 50%;
  font-size: 10px;
  font-weight: 800;
  color: var(--ion-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  background: var(--bee-tag-bg);
  padding: 3px 8px;
  border-radius: 6px;
  margin-top: 4px;
  text-align: center;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid transparent;
  transform: translateX(-50%) scale(calc(1 / var(--bee-scale)));
  transform-origin: center;
  z-index: 5;
}



.flying-bee.is-me .bee-name-tag {
  background: var(--ion-color-secondary);
  color: black;
  box-shadow: 0 0 10px rgba(var(--ion-color-secondary-rgb), 0.5);
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #555; /* Offline */
  margin-right: 5px;
  box-shadow: 0 0 5px rgba(0,0,0,0.5);
  transition: all 0.3s;
}

.status-dot.online {
  background: #2dd36f; /* Online Green */
  box-shadow: 0 0 8px rgba(45, 211, 111, 0.6);
}

/* Buzz Bubble */
.buzz-bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  background: white;
  color: black;
  padding: 4px 6px;
  border-radius: 10px;
  margin-bottom: 12px; /* Reduced from 30px to bring it closer to the bee */
  width: 80px;
  white-space: normal;
  text-align: center;
  box-shadow: 0 4px 15px rgba(255, 191, 0, 0.4);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  line-height: 1.1;
  transform: translateX(-50%) scale(calc(1 / var(--bee-scale)));
  transform-origin: bottom center;
}

.buzz-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: white transparent transparent transparent;
}

.buzz-bubble p {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.empty-hive {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
  padding: 40px;
  text-align: center;
  z-index: 5;
}

.lonely-nest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.giant-emoji {
  font-size: 80px;
  margin-bottom: 10px;
  filter: drop-shadow(0 0 15px rgba(255, 191, 0, 0.4));
}

.lonely-nest h2 {
  color: var(--ion-text-color);
  font-weight: 800;
  margin: 0;
}

.lonely-nest p {
  color: #777;
  font-size: 14px;
  line-height: 1.5;
  max-width: 250px;
  margin-bottom: 10px;
}

.invite-btn {
  --border-radius: 12px;
  font-weight: 700;
  text-transform: none;
  margin-top: 10px;
}

/* Modal Stying */
.buzz-modal {
    --background: rgba(0, 0, 0, 0.30);
    --box-shadow: none;
}

.modal-wrapper {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  backdrop-filter: blur(25px);
  --webkit-backdrop-filter: blur(25px);
  overflow: hidden;
}

.modal-header {
  padding: 20px 20px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;
  background: rgba(0, 0, 0, 0.849);
  backdrop-filter: blur(25px);
  --webkit-backdrop-filter: blur(25px);
}

.history-mode-header {
  margin-bottom: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.segment-container {
  padding: 0 40px;
}

.compact-chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  text-align: left;
}

.compact-avatar {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.05); /* Softer background */
  border-radius: 12px; /* More modern shape */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: visible;
  position: relative;
}

.compact-details h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: white;
  cursor: pointer;
}

.mini-status {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.mini-status::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #777;
}

.mini-status.online {
  color: #2dd36f;
}

.mini-status.online::before {
  background: #2dd36f;
  box-shadow: 0 0 5px #2dd36f;
}

.custom-segment {
  --background: rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 4px;
}

.custom-segment ion-segment-button {
  --indicator-color: var(--ion-color-primary);
  --color: rgba(255, 255, 255, 0.5);
  --color-checked: #1a1a2e;
  font-weight: 800;
  font-size: clamp(10px, 3vw, 12px);
  letter-spacing: 1px;
  min-height: 36px;
}

.modal-header h2 {
    margin: 0;
}

.view-profile-link {
    font-size: 10px;
    font-weight: 800;
    color: var(--ion-color-primary);
    letter-spacing: 1.5px;
    cursor: pointer;
    display: inline-block;
    padding: 6px 14px;
    background: rgba(255, 191, 0, 0.1);
    border-radius: 20px;
    border: 1px solid rgba(255, 191, 0, 0.2);
    width: fit-content;
    transition: all 0.2s ease;
}

.view-profile-link:active {
  transform: scale(0.9);
  background: rgba(255, 191, 0, 0.2);
}

.header-links {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 5px;
}

.call-link {
  color: #2dd36f;
  background: rgba(45, 211, 111, 0.1);
  border-color: rgba(45, 211, 111, 0.2);
}

.wide-call-btn {
  width: 100%;
  height: clamp(50px, 12vw, 56px);
  background: rgba(45, 211, 111, 0.05);
  border: 1.5px solid rgba(45, 211, 111, 0.3);
  border-radius: 18px;
  color: #2dd36f;
  font-weight: 800;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 15px;
  letter-spacing: 1.5px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(45, 211, 111, 0.15);
}

.wide-call-btn:active {
  transform: scale(0.98);
  background: rgba(45, 211, 111, 0.15);
}


.chat-header-call-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #2dd36f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  margin-left: auto;
  transition: all 0.2s ease;
}

.chat-header-call-btn:active {
  transform: scale(0.9);
  background: rgba(45, 211, 111, 0.1);
}


.large-avatar-hex {
  position: relative;
  width: 80px;
  height: 90px;
  margin: 0 auto;
}

.modal-streak-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: linear-gradient(135deg, #ff6b35, #ff9500);
  border-radius: 14px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.4);
  animation: streakGlow 2s ease-in-out infinite;
  z-index: 10;
}

.modal-streak-badge .streak-fire {
  font-size: 16px;
  animation: flicker 1.5s infinite;
}

.modal-streak-badge .streak-count {
  font-size: 14px;
  font-weight: 800;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.hexagon {
  width: 100%;
  height: 100%;
  background: var(--ion-color-primary);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: black;
  position: relative;
  overflow: visible;
}

.modal-header h2 {
  margin: 0;
  font-weight: 800;
  font-size: clamp(1.2rem, 5vw, 1.6rem);
  color: var(--ion-text-color);
}

.modal-header p {
  margin: 4px 0 0;
  color: #777;
  font-size: 14px;
}

.modal-main-content {
    flex: 1;
    --background: transparent;
    --padding-top: 0;
    --padding-bottom: 0;
    overscroll-behavior: contain;
}

.modal-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 10px 20px;
    -webkit-overflow-scrolling: touch;
}

.modal-body-inner {
    padding: 10px 20px;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    --background: transparent;
}

.modal-footer {
    padding: 10px 10px calc(15px + env(safe-area-inset-bottom));
    background: rgba(0, 0, 0, 0.89);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.compose-view {
    display: flex;
    flex-direction: column;
    gap: 5px;
    overflow: hidden;
    padding-bottom: 20px;
}

.message-input-area {
  padding: 12px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.custom-textarea {
  --padding-start: 0;
  --padding-end: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--ion-text-color);
}

.section-label {
    font-size: 11px;
    text-transform: uppercase;
    color: #666;
    font-weight: 800;
    margin-bottom: 10px;
}

.preset-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 5px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.preset-chips::-webkit-scrollbar {
  display: none;
}

.chip {
  flex-shrink: 0;
  padding: 8px 18px;
  background: var(--glass-bg);
  border-radius: 100px;
  font-size: 13px;
  color: var(--ion-text-color);
  border: 1px solid var(--glass-border);
  transition: all 0.2s;
  cursor: pointer;
}

.chip.active {
    background: var(--ion-color-primary);
    color: black;
    border-color: var(--ion-color-primary);
    font-weight: 600;
}

.modal-footer-action {
    padding: 10px 0;
}

.buzz-send-btn-ion {
    --background: var(--ion-color-primary);
    --color: black;
    --padding-top: 24px;
    --padding-bottom: 24px;
    font-weight: 800;
    font-size: 18px;
    margin: 0;
    height: 64px;
    --border-radius: 18px 0 0 18px;
}

.buzz-send-btn {
  width: 100%;
  height: 60px;
  background: var(--ion-color-primary);
  border: none;
  border-radius: 18px;
  color: black;
  font-weight: 800;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 4px 15px rgba(255, 191, 0, 0.3);
}

.gold-glow {
    border: 1.5px solid rgba(255, 191, 0, 0.4);
}

.hex-glow {
    filter: drop-shadow(0 0 15px rgba(255, 191, 0, 0.6));
}

.custom-fab {
    margin-right: 10px;
    margin-bottom: 20px;
    
}

.custom-fab ion-fab-button {
    --box-shadow: 0 4px 15px rgba(255, 191, 0, 0.4);
    border-radius: 100px;
    overflow: hidden;
}

.icon-only-btn {
    --padding-start: 8px;
    --padding-end: 8px;
}

.mini-bee-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  position: relative;
  flex-shrink: 0;
  pointer-events: none;
}

/* Search Modal Styles */
.search-input-area {
    padding: 16px;
    border-radius: 16px;
}

.search-item {
  --background: transparent;
  --color: var(--ion-text-color);
  --padding-start: 0;
}

.search-item ion-icon {
    color: var(--ion-color-primary);
    font-size: 24px;
    margin-right: 12px;
    
}

.custom-input {
    font-size: 18px;
    font-weight: 600;
}

.btn-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.buzz-send-btn:active {
  transform: scale(0.98);
}

.buzz-send-btn:disabled {
    opacity: 0.5;
    background: #444;
}

.divider {
    display: flex;
    align-items: center;
    gap: 15px;
    margin: 20px 0;
    color: #444;
    font-size: 11px;
    font-weight: 800;
}

.divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--glass-border);
}

.scan-btn {
    width: 100%;
    height: 56px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 18px;
    color: var(--ion-color-primary);
    font-weight: 700;
    cursor: pointer;
}

.scan-btn ion-icon {
    font-size: 20px;
}

/* Animations */
.pop-enter-active {
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.add-bee-btn-mini {
  --padding-start: 8px;
  --padding-end: 8px;
  --color: var(--ion-color-primary);
  margin: 0;
  height: 40px;
  filter: drop-shadow(0 0 5px rgba(255, 191, 0, 0.3));
}

.add-bee-btn-mini ion-icon {
  font-size: 28px;
}
.pop-leave-active {
  animation: pop-in 0.3s reverse ease-in;
}

@keyframes pop-in {
  0% { transform: translateX(-50%) scale(0) translateY(10px); opacity: 0; }
  100% { transform: translateX(-50%) scale(calc(1 / var(--bee-scale))) translateY(0); opacity: 1; }
}

/* Request Modal Specifics */
.requests-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.request-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    margin: 0 10px;
}

.request-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mini-bee {
    font-size: 24px;
}

.request-details h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: var(--ion-text-color);
}

.request-details p {
    margin: 2px 0 0;
    font-size: 12px;
    color: #666;
}

.accept-btn {
    background: var(--ion-color-primary);
    color: black;
    border: none;
    padding: 8px 16px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 12px;
    cursor: pointer;
}

.request-actions {
    display: flex;
    gap: 8px;
}

.reject-btn {
    background: var(--glass-bg);
    color: #888;
    border: 1px solid var(--glass-border);
    padding: 8px;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-requests {
    text-align: center;
    padding: 40px 0;
}

.empty-requests p {
    color: #555;
    margin-top: 10px;
    font-weight: 600;
}

.offline-notice {
    margin-top: 15px;
    padding: 10px 15px;
    background: rgba(255, 196, 9, 0.1);
    border: 1px solid rgba(255, 196, 9, 0.2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--ion-color-warning);
    font-size: 13px;
    font-weight: 600;
    text-align: left;
}

.offline-notice ion-icon {
    font-size: 20px;
    flex-shrink: 0;
}

.history-section {
    margin-top: 25px;
    padding-bottom: 10px;
}

.history-toggle-btn {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--ion-color-primary);
}

.history-toggle-btn ion-icon {
    font-size: 20px;
}

.empty-history {
    text-align: center;
    padding: 60px 20px;
    opacity: 0.5;
}

.empty-history ion-icon {
    font-size: 48px;
    margin-bottom: 10px;
}

.back-to-compose-btn {
    display: none; /* Removed in favor of chat input */
}

.history-view {
    display: flex;
    flex-direction: column;
    background: transparent;
    min-height: 100%;
}

.history-list {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    flex: 1;
    gap: 5px;
    margin-top: 10px;
    padding-bottom: 20px;
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
}

.recording-mode {
  background: rgba(211, 47, 47, 0.1);
  border: 1px solid rgba(211, 47, 47, 0.3);
  justify-content: space-between;
  padding: 8px 16px;
}

.recording-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recording-dot {
  width: 10px;
  height: 10px;
  background: #d32f2f;
  border-radius: 50%;
  animation: pulse-red 1s infinite;
}

@keyframes pulse-red {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

.recording-timer {
  color: #fff;
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
  font-size: 16px;
}

.recording-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.cancel-text-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  border: none;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}

.send-round-btn {
  background: var(--ion-color-primary);
  color: #000;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(255, 191, 0, 0.3);
}

.compose-actions-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.flex-1 { flex: 1; }

.voice-btn-round {
  width: 50px;
  height: 64px;
  border-radius: 0 18px 18px 0;
  background: var(--ion-color-primary);
  border: none;
  color: black;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.voice-btn-round:active {
    transform: scale(0.9) rotate(-10deg);
}

.voice-btn-round ion-icon {
    font-size: 22px;
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
    flex: 1; /* Added to take up remaining space */
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
    margin-bottom: 3px;
}

.chat-send-btn:active {
    transform: scale(0.9);
}

.chat-send-btn:disabled {
    opacity: 0.5;
    background: #333;
}

.chat-send-btn ion-icon {
    font-size: 18px;
    color: black;
}

.gold-glow-mini {
    box-shadow: 0 0 15px rgba(255, 191, 0, 0.1);
}

.history-item {
    display: flex;
    flex-direction: column;
    max-width: 80%;
    margin-bottom: 0;
    transition: all 0.2s ease;
}

.history-item.is-last {
    margin-bottom: 12px;
}

.history-item.sent {
    align-self: flex-end;
}

.history-item.received {
    align-self: flex-start;
}

.msg-bubble {
    padding: 0px 14px;
    border-radius: 18px;
    position: relative;
    font-size: 15px;
    line-height: 1.4;
    word-break: break-word;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.msg-bubble.has-media {
    padding: 6px;
    background: rgba(255, 255, 255, 0.05);
}

/* Grouping Logic for Sent (Own) */
.history-item.sent.is-first .msg-bubble { border-bottom-right-radius: 2px; }
.history-item.sent.has-next .msg-bubble { border-top-right-radius: 2px; border-bottom-right-radius: 2px; }
.history-item.sent.is-last:not(.is-first) .msg-bubble { border-top-right-radius: 2px; border-bottom-right-radius: 18px; }

/* Grouping Logic for Received (Partner) */
.history-item.received.is-first .msg-bubble { border-bottom-left-radius: 2px; }
.history-item.received.has-next .msg-bubble { border-top-left-radius: 2px; border-bottom-left-radius: 2px; }
.history-item.received.is-last:not(.is-first) .msg-bubble { border-top-left-radius: 2px; border-bottom-left-radius: 18px; }

.history-item.sent .msg-bubble {
    background: linear-gradient(135deg, #ffbf00, #ff9d00);
    color: #000;
    font-weight: 500;
}

.history-item.received .msg-bubble {
    background: rgba(19, 25, 32, 0.658);
    color: #efefef;
    border: 1px solid var(--glass-border);
    backdrop-filter: var(--glass-blur-heavy);
    -webkit-backdrop-filter: var(--glass-blur-heavy);
}

.msg-time {
    font-size: 10px;
    opacity: 0.4;
    margin-top: 5px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 5px;
}

.sent .msg-time {
    color: #000;
    opacity: 0.5;
}

/* Image Support Styles */
.input-actions {
    margin-top: 10px;
    display: flex;
    gap: 10px;
    position: relative;
    z-index: 20;
    pointer-events: auto;
}

.image-select-btn {
    background: var(--glass-background);
    border: 1px solid var(--glass-border);
    color: var(--ion-color-primary);
    padding: 8px 12px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    z-index: 10;
}

.image-preview-container {
    position: relative;
    width: 100%;
    max-height: 200px;
    border-radius: 16px;
    overflow: hidden;
    margin-top: 10px;
}

.preview-img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 12px;
}

.clear-img-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    color: white;
    font-size: 24px;
    background: rgba(0,0,0,0.5);
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.msg-image-wrapper {
    margin-bottom: 8px;
    border-radius: 12px;
    overflow: hidden;
}

.msg-image {
    width: 100%;
    max-width: 200px;
    max-height: 200px;
    object-fit: cover;
    display: block;
}

.chat-tool-btn {
    background: transparent;
    border: none;
    padding: 8px;
    color: var(--ion-color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    z-index: 20;
    pointer-events: auto;
}

.chat-tool-btn ion-icon {
    font-size: 24px;
}

.chat-tool-btn .has-img {
    color: var(--ion-color-secondary);
}

.chat-preview-mini {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 20px;
    width: 60px;
    height: 60px;
    border-radius: 12px;
    border: 2px solid var(--ion-color-primary);
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
}

.chat-preview-mini img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.clear-mini-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    background: white;
    color: black;
    border-radius: 50%;
    font-size: 18px;
    display: flex;
}
/* Full Image Viewer */
.full-img-modal {
    --background: rgba(0,0,0,0.9);
}

.full-img-container {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: black;
}

.full-img-container img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.full-img-container .close-btn {
    position: absolute;
    top: env(safe-area-inset-top);
    right: 15px;
    z-index: 100;
}

/* Reactions Styles */
.reactions-container {
  display: flex;
  position: absolute;
  bottom: -10px;
  right: 8px;
  z-index: 10;
  gap: 2px;
}

.sent .reactions-container {
  right: auto;
  left: 8px;
}

.reaction-pill {
  background: #1e1e1e;
  padding: 2px 6px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.reaction-pill:active {
  transform: scale(0.9);
}

.reaction-pill.reacted {
  background: rgba(255, 191, 0, 0.2);
  border-color: rgba(255, 191, 0, 0.4);
}

.sent .reaction-pill {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.05);
}

.sent .reaction-pill.reacted {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.reaction-pill .emoji {
  font-size: 12px;
}

.reaction-pill .count {
  font-weight: 800;
  color: rgba(255, 255, 255, 0.8);
}

.sent .reaction-pill .count {
  color: rgba(0, 0, 0, 0.7);
}

/* Emoji Picker Carousel Styles */
.emoji-picker-popover {
  --width: fit-content;
  --max-width: 90vw;
  --backdrop-opacity: 0.1;
  --background: transparent;
  --box-shadow: none;
}

.emoji-picker-content {
  display: flex;
  overflow-x: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  padding: 8px 12px;
  gap: 8px;
  background: rgba(30, 30, 30, 0.8);
  backdrop-filter: var(--glass-blur-heavy);
  -webkit-backdrop-filter: var(--glass-blur-heavy);
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  /* Hide scrollbar */
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.emoji-picker-content::-webkit-scrollbar {
  display: none;
}

.emoji-option {
  font-size: 26px;
  min-width: 48px;
  height: 48px;
  flex: 0 0 auto;
  scroll-snap-align: center;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-option:active {
  transform: scale(1.4) translateY(-10px);
}

.emoji-option:hover {
  transform: scale(1.2);
}

/* Unread Badge Styles */
.unread-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff4757;
    color: white;
    font-size: 10px;
    font-weight: 800;
    min-width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #1a1a2e;
    box-shadow: 0 4px 10px rgba(255, 71, 87, 0.4);
    z-index: 10;
}

.add-friend-header-btn {
    --background: var(--ion-color-primary);
    --color: black;
    --border-radius: 10px;
    font-weight: 900;
    font-size: 11px;
    letter-spacing: 0.5px;
    margin: 0;
    height: 36px;
    box-shadow: 0 4px 12px rgba(255, 191, 0, 0.3);
}

.add-friend-header-btn ion-icon {
    font-size: 18px;
    margin-right: 4px;
}

.read-receipt {
    font-size: 13px;
    margin-left: 4px;
    color: rgba(255, 255, 255, 0.4);
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
}

.own-buzz .read-receipt,
.sent .read-receipt {
    color: rgba(0, 0, 0, 0.4);
}

.receipt-spinner {
    width: 12px;
    height: 12px;
    --color: rgba(0, 0, 0, 0.4);
}

.sent:not(.has-media) .receipt-spinner,
.sent:not(.has-media) .read-receipt {
    --color: rgba(0, 0, 0, 0.4);
    color: rgba(0, 0, 0, 0.4);
}

.sent.has-media .receipt-spinner,
.sent.has-media .read-receipt {
    --color: rgba(255, 255, 255, 0.6);
    color: rgba(255, 255, 255, 0.6);
}

.error-receipt {
    font-size: 13px;
    color: #e53935;
}

.msg-image-wrapper {
    animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.animate-pop {
    animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes badgePop {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

/* Tutorial Overlay Styles */
.tutorial-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.tutorial-card {
    width: 100%;
    max-width: 320px;
    padding: 30px;
    border-radius: 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    background: rgba(30, 30, 30, 0.9) !important;
}

.tutorial-icon-box {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: rgba(255, 191, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #ffbf00;
    border: 1px solid rgba(255, 191, 0, 0.2);
}

.tutorial-card h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: #ffbf00;
}

.tutorial-card p {
    margin: 0;
    font-size: 14px;
    color: #eee;
    line-height: 1.6;
}

.tutorial-footer {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
}

.step-indicator {
    font-size: 12px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 1px;
}

.tutorial-hint {
    margin-top: 24px;
    font-size: 11px;
    font-weight: 700;
    color: rgba(255, 191, 0, 0.5);
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: pulse-op 1.5s infinite;
}

@keyframes pulse-op {
    0% { opacity: 0.3; }
    50% { opacity: 0.8; }
    100% { opacity: 0.3; }
}

.fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
}


/* Notification Specific Styles */
.unread-dot-notif {
  width: 8px;
  height: 8px;
  background: var(--ion-color-primary);
  border-radius: 50%;
  box-shadow: 0 0 12px var(--ion-color-primary);
  flex-shrink: 0;
}

.unread-notif {
  border-color: rgba(255, 191, 0, 0.3) !important;
  background: rgba(255, 191, 0, 0.03) !important;
}

.notif-time {
  font-size: 9px;
  color: #555;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.request-card.unread-notif {
    border-left: 2px solid var(--ion-color-primary);
}
.super-admin-dashboard-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.read-receipt ion-icon.seen {
  color: #3880ff; /* Blue for seen */
}

/* barcode scanner transparency */
:host-context(body.barcode-scanner-active) .hive-content,
:host-context(body.barcode-scanner-active) .hive-background,
:host-context(body.barcode-scanner-active) .main-segment-wrapper {
  --background: transparent !important;
  background: transparent !important;
  opacity: 0;
  pointer-events: none;
}

/* Garden Management Styles */
.garden-manage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
}

.garden-toggle {
  margin-left: 10px;
  --handle-background: #ffd700;
  --handle-background-checked: #fff;
  --background-checked: #ffd700;
}

.hidden-status {
  color: #ff4757 !important;
  font-weight: 600;
}

.emoji-picker-popover {
    --width: 320px;
    --height: 70px;
    --background: rgba(0, 0, 0, 0.85);
    --backdrop-filter: blur(24px);
    --border-radius: 35px;
    --box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    --backdrop-opacity: 0;
}

.emoji-picker-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    overflow: hidden;
    background: transparent;
}

.emoji-carousel {
    flex: 1;
    display: flex;
    overflow-x: auto;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    gap: 14px;
    padding: 0 15px;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
}

.emoji-carousel::-webkit-scrollbar {
    display: none;
}

.emoji-delete-btn {
    width: 54px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(235, 68, 90, 0.15);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    color: #eb445a;
    font-size: 20px;
    cursor: pointer;
    transition: background 0.2s;
}

.emoji-delete-btn:active {
    background: rgba(235, 68, 90, 0.3);
}

.emoji-option {
    font-size: 34px;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    flex-shrink: 0;
    scroll-snap-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
}

.emoji-option:active {
    transform: scale(1.8);
}



.notif-type-emoji {
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 191, 0, 0.1);
  width: 24px;
  height: 24px;
  border-radius: 6px;
}
</style>
