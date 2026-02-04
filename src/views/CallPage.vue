<template>
  <ion-page>
    <div class="call-container" :class="{ 'error-gradient': callState.error }">
      <!-- Background Ambient Glow -->
      <div class="glow-orb top"></div>
      <div class="glow-orb bottom"></div>

      <!-- Header Status -->
      <div class="call-header">
        <div class="status-badge" :class="[callStatus.class, { 'ringing-badge': callState.isCalling || callState.incomingCall }]">
          <span class="pulse-dot"></span>
          {{ callStatus.text }}
        </div>

        <h2 v-if="remotePeerId" class="remote-id">@{{ remotePeerId }}</h2>
      </div>

      <!-- Main Animation Area (The Garden) -->
      <div class="garden-area">
        <!-- Floating Garden Decor -->
        <div class="garden-decor flower-1">🌸</div>
        <div class="garden-decor flower-2">🌼</div>
        <div class="garden-decor flower-3">🌸</div>
        <div class="garden-decor flower-4">🌼</div>
        <div class="garden-decor sparkle-1">✨</div>
        <div class="garden-decor sparkle-2">✨</div>

        <!-- Local Bee -->
        <div 
          v-if="callState.activeCall || callState.isCalling || callState.incomingCall"
          class="bee-wrapper local-bee"
          :style="beeStyles.local"
          :class="{ 'talking': isLocalTalking }"
        >
          <!-- Animation Particles (Local) -->
          <transition-group name="particle-fade">
            <div 
              v-for="p in localParticles" 
              :key="p.id" 
              class="bee-particle"
              :style="{ 
                left: p.startX + 'px', 
                top: p.startY + 'px',
                '--x': (p.x * 2) + 'px', 
                '--y': (p.y * 2) + 'px' 
              }"
            >
              {{ p.emoji }}
            </div>
          </transition-group>



          <div class="bee-avatar-container" :style="{ transform: `rotate(${beeRotations.local}deg)` }">
            <div class="bee-avatar">
              <div class="talking-squash" :class="{ 'talking-anim': isLocalTalking }">
                <div class="anim-container" :class="{ 'spin-anim': activeAnims.local === 'SPIN' }">
                  <BeeComposite 
                    :customization="localCustomization" 
                    :animated="true" 
                    :scale="0.4" 
                    :flipped="beeFlipped.local"
                  />
                </div>
              </div>
              <div class="talking-aura" v-if="isLocalTalking"></div>
            </div>
          </div>

          <span class="bee-label">
            <span class="online-dot"></span>
            YOU
          </span>

        </div>




        <!-- Remote Bee -->
        <div 
          v-if="callState.activeCall || callState.isCalling || callState.incomingCall"
          class="bee-wrapper remote-bee"
          :style="beeStyles.remote"
          :class="{ 'talking': isRemoteTalking }"
        >
          <!-- Animation Particles (Remote) -->
          <transition-group name="particle-fade">
            <div 
              v-for="p in remoteParticles" 
              :key="p.id" 
              class="bee-particle"
              :style="{ 
                left: p.startX + 'px', 
                top: p.startY + 'px',
                '--x': (p.x * 2) + 'px', 
                '--y': (p.y * 2) + 'px' 
              }"
            >
              {{ p.emoji }}
            </div>
          </transition-group>



          <div class="bee-avatar-container" :style="{ transform: `rotate(${beeRotations.remote}deg)` }">
            <div class="bee-avatar">
              <div class="talking-squash" :class="{ 'talking-anim': isRemoteTalking }">
                <div class="anim-container" :class="{ 'spin-anim': activeAnims.remote === 'SPIN' }">
                  <BeeComposite 
                    :customization="remoteCustomization" 
                    :animated="true" 
                    :scale="0.4" 
                    :flipped="beeFlipped.remote"
                  />
                </div>
              </div>
              <div class="talking-aura" v-if="isRemoteTalking"></div>
            </div>
          </div>
          <span class="bee-label">
            <span class="online-dot"></span>
            @{{ remotePeerId?.toUpperCase() }}
          </span>

        </div>


        <!-- Audio Element for Remote Stream -->
        <audio ref="remoteAudio" autoplay class="hidden-audio"></audio>


        <!-- Empty/Ended State -->
        <div v-if="!callState.activeCall && !callState.isCalling && !callState.incomingCall" class="ended-state">
           <div class="ended-icon">🐝</div>
           <h3>Call Ended</h3>
           <p>Returning to Hive...</p>
           <button class="return-btn" @click="refreshAndExit">
             <ion-icon :icon="chevronBackOutline" />
             Return Now
           </button>
        </div>





        <!-- Connection Restriction Warning -->
        <div v-if="callState.error && callState.error !== 'Syncing...'" class="error-modal">

          <div class="glow-orb error-glow"></div>
          <div class="error-content">
            <ion-icon :icon="warningOutline" class="error-icon"></ion-icon>
            <h3>Oops! Connection Blocked</h3>
            <p>{{ callState.error }}</p>
            <p class="hint">Top tip: Switch to <b>Mobile Data</b>! 🐝</p>
            <ion-button fill="clear" @click="endCall">Dismiss</ion-button>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="call-footer">
        <!-- Incoming Call Swipe UI -->
        <div v-if="callState.incomingCall && !callState.activeCall" class="swipe-container">
          <div 
            class="swipe-track"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          >
            <div class="swipe-side reject">
               <ion-icon :icon="closeOutline"></ion-icon>
               <span>Reject</span>
            </div>
            
            <div class="swipe-handle" :style="{ transform: `translateX(${swipeOffset}px)` }">
               <div class="handle-inner">
                 <ion-icon :icon="callOutline"></ion-icon>
               </div>
            </div>

            <div class="swipe-side accept">
               <span>Answer</span>
               <ion-icon :icon="checkmarkOutline"></ion-icon>
            </div>

            <div class="swipe-hint" v-if="swipeOffset === 0">
               <ion-icon :icon="chevronBackOutline" class="arrow left"></ion-icon>
               Swipe to Answer or Reject
               <ion-icon :icon="chevronForwardOutline" class="arrow right"></ion-icon>
            </div>
          </div>
        </div>

        <!-- Active Call Controls -->
        <div v-if="callState.activeCall" class="controls-container">
           <div class="control-btn mute" :class="{ active: isMuted }" @click="toggleMute">
             <ion-icon :icon="isMuted ? micOffOutline : micOutline"></ion-icon>
           </div>
           
           <div class="control-btn hangup" @click="endCall">
             <ion-icon :icon="callOutline" class="hangup-icon"></ion-icon>
           </div>

            <div class="control-btn speaker" :class="{ active: !isSpeaker }" @click="toggleSpeaker">
              <ion-icon :icon="isSpeaker ? volumeHighOutline : volumeMediumOutline"></ion-icon>
            </div>

        </div>

        <!-- Outgoing Call Controls -->
        <div v-if="callState.isCalling" class="controls-container">
           <div class="control-btn hangup" @click="endCall">
             <ion-icon :icon="callOutline" class="hangup-icon"></ion-icon>
           </div>
           <p class="ringing-text">Buzzing...</p>
        </div>

        <!-- Animation Trigger Bar -->
        <div v-if="callState.activeCall || callState.isCalling" class="animation-bar glass-panel">
          <button v-for="anim in animations" 
                  :key="anim.id" 
                  class="anim-trigger" 
                  @click="triggerAnimation(anim.id)">
            <span class="anim-icon">{{ anim.icon }}</span>
            <span class="anim-label">{{ anim.label }}</span>
          </button>
        </div>

      </div>

    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonIcon, IonButton
} from '@ionic/vue';
import { 
  callOutline, micOutline, micOffOutline, 
  volumeHighOutline, volumeMediumOutline,
  checkmarkOutline, closeOutline,
  chevronBackOutline, chevronForwardOutline,
  warningOutline
} from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { useCallService } from '@/services/CallService';
import { useUserService } from '@/services/UserService';
import BeeComposite from '@/components/BeeComposite.vue';
import { useRouter } from 'vue-router';

const { callState, answerCall, rejectCall, endCall, sendReaction: signalReaction } = useCallService();
const { getUserProfile, userBeeId } = useUserService();
const router = useRouter();

const remoteAudio = ref<HTMLAudioElement | null>(null);

const localCustomization = ref({ top: 'none', body: 'none', eyes: 'none' });
const remoteCustomization = ref({ top: 'none', body: 'none', eyes: 'none' });

// Animations & Particles Logic
const localParticles = ref<any[]>([]);
const remoteParticles = ref<any[]>([]);
const animations = [
  { id: 'LOVE', icon: '💝', label: 'Heart' },
  { id: 'ZIGZAG', icon: '⚡', label: 'Dash' },
  { id: 'FIGURE8', icon: '♾️', label: 'Loop' },
  { id: 'SPIN', icon: '🎡', label: 'Spin' },
  { id: 'BOUNCE', icon: '🏀', label: 'Bounce' }
];

const activeAnims = reactive({
  local: null as string | null,
  remote: null as string | null
});

const beeRotations = reactive({
  local: 0,
  remote: 0
});

const beeFlipped = reactive({
  local: false,
  remote: false
});

const beeTargets = reactive({
  local: { x: 30, y: 50 },
  remote: { x: 70, y: 50 }
});

let localTargetTimer: any = null;
let remoteTargetTimer: any = null;

const updateBeeTarget = (who: 'local' | 'remote') => {
  // If call isn't active, wait and retry
  if (!callState.value.activeCall) {
    setTimeout(() => updateBeeTarget(who), 1000);
    return;
  }

  // If animating, wait and retry
  if (activeAnims[who]) {
    setTimeout(() => updateBeeTarget(who), 2000);
    return;
  }
  
  const currentLeft = parseFloat(beeStyles[who].left);
  
  // New random target
  beeTargets[who] = { 
    x: 15 + Math.random() * 70, 
    y: 20 + Math.random() * 55 
  };
  
  beeSpeeds[who] = 4000 + Math.random() * 4000;
  
  // Flip based on direction BEFORE updating position
  beeFlipped[who] = beeTargets[who].x < currentLeft;
  
  // Apply update for transition
  beeStyles[who].top = `${beeTargets[who].y}%`;
  beeStyles[who].left = `${beeTargets[who].x}%`;
  beeStyles[who].transition = `all ${beeSpeeds[who]}ms linear`;

  // Re-schedule
  if (who === 'local') {
    if (localTargetTimer) clearTimeout(localTargetTimer);
    localTargetTimer = setTimeout(() => updateBeeTarget('local'), beeSpeeds[who]);
  } else {
    if (remoteTargetTimer) clearTimeout(remoteTargetTimer);
    remoteTargetTimer = setTimeout(() => updateBeeTarget('remote'), beeSpeeds[who]);
  }
};







const triggerAnimation = (animId: string) => {
  playAnimation('local', animId);
  if (callState.value.remotePeerId) {
    signalReaction(callState.value.remotePeerId, animId);
  }
};

const playAnimation = (who: 'local' | 'remote', animId: string) => {
  activeAnims[who] = animId;
  
  if (animId === 'LOVE') {
    const arr = who === 'local' ? localParticles : remoteParticles;
    for (let i = 0; i < 8; i++) {
       const id = Math.random();
       arr.value.push({
         id,
         emoji: '❤️',
         startX: 0,
         startY: 0,
         x: (Math.random() - 0.5) * 150,
         y: (Math.random() - 0.5) * 150
       });
       setTimeout(() => {
         arr.value = arr.value.filter(p => p.id !== id);
       }, 1500);
    }
  }

  setTimeout(() => {
    activeAnims[who] = null;
    updateBeeTarget(who);
  }, 3000);
};




watch(() => callState.value.lastReaction, (react) => {
  if (react && react.sender === callState.value.remotePeerId) {
    playAnimation('remote', react.emoji);
  }
});

onMounted(() => {
  // Start independent flight timers
  updateBeeTarget('local');
  setTimeout(() => updateBeeTarget('remote'), 2000);
});

onUnmounted(() => {
  if (localTargetTimer) clearTimeout(localTargetTimer);
  if (remoteTargetTimer) clearTimeout(remoteTargetTimer);
});






// Sink stream to audio element
watch(() => callState.value.remoteStream, (stream) => {

  if (stream && remoteAudio.value) {
    remoteAudio.value.srcObject = stream;
  }
});



const fetchCustomizations = async () => {
  if (userBeeId.value) {
    const localProfile = await getUserProfile(userBeeId.value);
    if (localProfile?.customization) localCustomization.value = localProfile.customization;
  }
  
  if (callState.value.remotePeerId) {
    const remoteProfile = await getUserProfile(callState.value.remotePeerId);
    if (remoteProfile?.customization) remoteCustomization.value = remoteProfile.customization;
  }
};

// Swipe Logic
const swipeOffset = ref(0);
let startX = 0;
const SWIPE_THRESHOLD = 100;

const handleTouchStart = (e: TouchEvent) => {
  startX = e.touches[0].clientX;
};

const handleTouchMove = (e: TouchEvent) => {
  const currentX = e.touches[0].clientX;
  const diff = currentX - startX;
  swipeOffset.value = Math.max(-120, Math.min(120, diff));
};

const handleTouchEnd = () => {
  if (swipeOffset.value > SWIPE_THRESHOLD) {
    answerCall();
  } else if (swipeOffset.value < -SWIPE_THRESHOLD) {
    rejectCall();
  }
  swipeOffset.value = 0;
};

// Mute/Speaker logic
const isMuted = ref(false);
const isSpeaker = ref(true); // Default to loudspeak (speaker)


const toggleMute = () => {
  isMuted.value = !isMuted.value;
  if (callState.value.localStream) {
    callState.value.localStream.getAudioTracks().forEach(t => t.enabled = !isMuted.value);
  }
};

const toggleSpeaker = () => {
  isSpeaker.value = !isSpeaker.value;
  // Note: True speaker/earpiece switching is browser/OS dependent.
  // In most mobile browsers, 'autoplay' on the audio element routes to speaker.
  // We can attempt to use setSinkId if the browser supports it for experimental switching.
  if (remoteAudio.value && (remoteAudio.value as any).setSinkId) {
    // This is a placeholder for actual device-level speaker switching
    // which is restricted in many mobile browsers for security/privacy.
    console.log('Switching speaker state:', isSpeaker.value);
  }
};


// Bee Animation Logic
const beeStyles = reactive<any>({
  local: { top: '50%', left: '30%', transition: 'all 5s linear', transform: 'translate(-50%, -50%)' },
  remote: { top: '50%', left: '70%', transition: 'all 5s linear', transform: 'translate(-50%, -50%)' }
});

const beeSpeeds = reactive({
  local: 4000,
  remote: 4000
});





const isLocalTalking = ref(false);
const isRemoteTalking = ref(false);

let localAnalyser: AnalyserNode | null = null;
let remoteAnalyser: AnalyserNode | null = null;
let animationFrame: number | null = null;

const setupAudioAnalysis = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  if (callState.value.localStream && !localAnalyser) {
    const source = audioCtx.createMediaStreamSource(callState.value.localStream);
    localAnalyser = audioCtx.createAnalyser();
    localAnalyser.fftSize = 256;
    source.connect(localAnalyser);
  }

  if (callState.value.remoteStream && !remoteAnalyser) {
    const source = audioCtx.createMediaStreamSource(callState.value.remoteStream);
    remoteAnalyser = audioCtx.createAnalyser();
    remoteAnalyser.fftSize = 256;
    source.connect(remoteAnalyser);
  }

  if (animationFrame) return;

  const checkVolume = () => {
    if (localAnalyser) {
      const data = new Uint8Array(localAnalyser.frequencyBinCount);
      localAnalyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b) / data.length;
      if (avg > 20) {
        isLocalTalking.value = true;
      } else if (isLocalTalking.value) {
        // Lingering effect to prevent animation flickering
        setTimeout(() => {
          isLocalTalking.value = false;
        }, 300);
      }
    }
    
    if (remoteAnalyser) {
      const data = new Uint8Array(remoteAnalyser.frequencyBinCount);
      remoteAnalyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b) / data.length;
      if (avg > 20) {
        isRemoteTalking.value = true;
      } else if (isRemoteTalking.value) {
        setTimeout(() => {
          isRemoteTalking.value = false;
        }, 300);
      }
    }


    moveBee('local');
    moveBee('remote');

    animationFrame = requestAnimationFrame(checkVolume);
  };

  if (callState.value.activeCall) {
    checkVolume();
  }
};

const moveBee = (who: 'local' | 'remote') => {
  if (!callState.value.activeCall) return;
  
  const current = beeStyles[who];
  const talking = who === 'local' ? isLocalTalking.value : isRemoteTalking.value;
  const activeAnim = activeAnims[who];

  // If animating or talking, we need per-frame jitter/offsets
  // otherwise we let the CSS transition do the work for normal flight
  if (activeAnim || talking) {
    current.transition = activeAnim ? 'all 0.1s linear' : 'all 0.3s ease'; // Snappier for animations/talking
    
    let driftX = 0;
    let driftY = 0;
    let rot = 0;

    if (activeAnim === 'ZIGZAG') {
      driftX = Math.sin(Date.now() / 50) * 15;
      driftY = (Math.sin(Date.now() / 100)) * 10;
      rot = Math.sin(Date.now() / 50) * 15;
    } else if (activeAnim === 'FIGURE8') {
      const t = Date.now() / 400;
      driftX = Math.sin(t) * 25;
      driftY = (Math.sin(2 * t) / 2) * 25;
      rot = Math.cos(t) * 10;
    } else if (activeAnim === 'SPIN') {
      driftY = -2;
    } else if (activeAnim === 'BOUNCE') {
      const t = (Date.now() % 800) / 800; 
      driftY = (4 * t * (t - 1)) * 50; 
    } 
    
    const targetPos = activeAnim === 'BOUNCE' ? { x: 50, y: 75 } : (activeAnim ? { x: 50, y: 50 } : beeTargets[who]);
    
    current.top = `${targetPos.y + driftY}%`;
    current.left = `${targetPos.x + driftX}%`;

    
    if (activeAnim !== 'SPIN') {
      beeRotations[who] = rot;
    }

    // Facing direction
    if (Math.abs(driftX) > 0.5) {
      beeFlipped[who] = driftX < 0;
    }
  } else {
    // Normal flight orientation check
    // CSS transition is active, beeRotations should be 0
    beeRotations[who] = 0;
  }
};



watch(() => callState.value.error, (err) => {
  if (err && err !== 'Syncing...') {
    // If a hard error occurs, reload to clear stale PeerJS states
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
});

const refreshAndExit = () => {

  router.replace('/tabs/tab1');
  setTimeout(() => {
    window.location.reload();
  }, 100);
};

watch([() => callState.value.activeCall, () => callState.value.remoteStream], ([active, rStream]) => {
  if (active || rStream) {
    setupAudioAnalysis();
  }
});

// Navigate back when call ends

watch([() => callState.value.activeCall, () => callState.value.incomingCall, () => callState.value.isCalling], 
  ([active, incoming, calling], [oldActive, oldIncoming, oldCalling]) => {
    const wasBusy = oldActive || oldIncoming || oldCalling;
    const isBusy = active || incoming || calling;
    
    if (wasBusy && !isBusy) {
      setTimeout(() => {
        refreshAndExit();
      }, 1000);
    }
  }
);



const callStatus = computed(() => {
  if (callState.value.error) return { text: 'Network Error', class: 'error' };
  if (callState.value.activeCall) return { text: 'In Call', class: 'active' };
  if (callState.value.incomingCall) return { text: 'Incoming Buzz...', class: 'incoming' };
  if (callState.value.isCalling) return { text: 'Calling...', class: 'outgoing' };
  return { text: 'Ready', class: '' };
});

const remotePeerId = computed(() => callState.value.remotePeerId);

onMounted(async () => {
  fetchCustomizations();
  
  // 🎤 Pre-request mic permission as soon as the call screen appears
  // This ensures the prompt shows early, not just when hitting 'Accept'
  if (callState.value.incomingCall) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Release immediately
    } catch (e) {
    }
  }

  if (!callState.value.incomingCall && !callState.value.isCalling && !callState.value.activeCall) {
    router.replace('/tabs/tab1');
  }
});


watch(() => callState.value.remotePeerId, (newId) => {
    if (newId) fetchCustomizations();
});

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
</script>

<style scoped>
.call-container {
  height: 100vh;
  width: 100%;
  background: radial-gradient(circle at center, #1a1a1a 0%, #050505 100%);
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  font-family: 'Outfit', sans-serif;
}

.error-gradient {
  background: linear-gradient(135deg, #2a0505 0%, #050505 100%);
}

.glow-orb {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.12;
  z-index: 0;
}

.glow-orb.top {
  top: -150px;
  left: -100px;
  background: #ffbf00;
}

.glow-orb.bottom {
  bottom: -150px;
  right: -100px;
  background: #ff8c00;
}

.call-header {
  padding: 80px 20px 20px;
  text-align: center;
  z-index: 2;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 20px;
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 191, 0, 0.2);
  margin-bottom: 16px;
}

.status-badge.active .pulse-dot { background: #4caf50; box-shadow: 0 0 15px #4caf50; }
.status-badge.incoming .pulse-dot { background: #ffbf00; animation: pulse 0.8s infinite alternate; }
.status-badge.outgoing .pulse-dot { background: #ffbf00; animation: pulse 0.8s infinite alternate; }
.status-badge.error .pulse-dot { background: #ff4757; box-shadow: 0 0 15px #ff4757; }

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; box-shadow: 0 0 5px rgba(255, 191, 0, 0.5); }
  100% { transform: scale(1.6); opacity: 0.4; box-shadow: 0 0 20px rgba(255, 191, 0, 0.8); }
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-badge.ringing-badge {
  animation: badgeRinging 1s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 191, 0, 0.1);
  border-color: rgba(255, 191, 0, 0.5);
}

@keyframes badgeRinging {
  from { transform: scale(1); box-shadow: 0 0 5px rgba(255, 191, 0, 0.2); }
  to { transform: scale(1.05); box-shadow: 0 0 20px rgba(255, 191, 0, 0.4); }
}


.remote-id {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 4px 20px rgba(0,0,0,0.5);
  letter-spacing: -1px;
}


/* Garden / Animation Area */
.garden-area {
  flex: 1;
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.garden-decor {
  position: absolute;
  font-size: 1.5rem;
  opacity: 0.15;
  filter: blur(1px);
  pointer-events: none;
  animation: floatAmbient 10s infinite linear;
}

.flower-1 { top: 15%; left: 10%; animation-duration: 15s; }
.flower-2 { top: 80%; left: 80%; animation-duration: 18s; }
.flower-3 { top: 20%; left: 85%; animation-duration: 12s; }
.flower-4 { top: 70%; left: 15%; animation-duration: 20s; }
.sparkle-1 { top: 40%; left: 50%; font-size: 1rem; animation-duration: 8s; opacity: 0.2; }
.sparkle-2 { top: 60%; left: 30%; font-size: 1rem; animation-duration: 11s; opacity: 0.2; }

@keyframes floatAmbient {
  0% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(20px, 15px) rotate(120deg); }
  66% { transform: translate(-15px, 25px) rotate(240deg); }
  100% { transform: translate(0, 0) rotate(360deg); }
}


.bee-wrapper {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform: translate(-50%, -50%);
  will-change: top, left, transform;
}


.bee-avatar {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
}


.talking-squash {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.anim-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.talking-anim {
  animation: squashStretch 0.3s infinite alternate cubic-bezier(0.45, 0.05, 0.55, 0.95);
}


@keyframes squashStretch {
  from { transform: scale(1, 1); }
  to { transform: scale(1.3, 0.75); }
}


.talking-aura {
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  border-radius: 50%;
  border: 2px solid rgba(255, 191, 0, 0.4);
  animation: auraExpand 2s infinite ease-out;
}

@keyframes auraExpand {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}

.bee-label {
  margin-top: 16px;
  font-size: 0.7rem;
  font-weight: 900;
  color: white;
  background: rgba(0, 0, 0, 0.9);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 191, 0, 0.4);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.6);
  white-space: nowrap;
}


.online-dot {
  width: 8px;
  height: 8px;
  background: #2dd36f;
  border-radius: 50%;
  box-shadow: 0 0 8px #2dd36f;
}

/* Error Modal */

.error-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 85%;
  background: rgba(20, 5, 5, 0.95);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 30px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
}

.error-icon {
  font-size: 4rem;
  color: #ff4757;
  margin-bottom: 20px;
}

.error-modal h3 {
  font-weight: 800;
  margin-bottom: 10px;
}

.hint {
  font-size: 0.9rem;
  color: #888;
  margin-top: 15px;
}

/* Footer & Controls */
.call-footer {
  padding: 20px 20px 80px;
  z-index: 2;
}

.swipe-container {
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
}

.ended-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  animation: fadeIn 0.5s ease-out;
}

.ended-icon {
  font-size: 3rem;
  margin-bottom: 20px;
  filter: grayscale(1) opacity(0.5);
}

.ended-state h3 {
  font-weight: 800;
  margin: 0;
  letter-spacing: 1px;
}

.ended-state p {
  font-size: 0.9rem;
  color: #666;
  margin-top: 8px;
  margin-bottom: 25px;
}

.return-btn {
  background: rgba(255, 191, 0, 0.1);
  border: 1px solid rgba(255, 191, 0, 0.3);
  color: #ffbf00;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.15s ease;
}

.return-btn:active {
  transform: scale(0.95);
  background: rgba(255, 191, 0, 0.2);
}


@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -40%); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}

.swipe-track {

  height: 80px;
  background: rgba(255, 191, 0, 0.05); /* Tinted background */
  border-radius: 40px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  border: 2px solid rgba(255, 191, 0, 0.1);
  backdrop-filter: blur(25px);
  overflow: hidden;
  box-shadow: inset 0 2px 20px rgba(0,0,0,0.5);
}

.swipe-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
  z-index: 1;
}

.swipe-side ion-icon {
  font-size: 1.2rem;
}

.swipe-side.reject { color: #ff3b30; }
.swipe-side.accept { color: #28cd41; }

.swipe-handle {
  position: absolute;
  left: 50%;
  margin-left: -32px;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #ffbf00, #ff9500);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 30px rgba(255, 191, 0, 0.6), 0 0 40px rgba(255, 191, 0, 0.2);
  z-index: 5;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.swipe-handle::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: white;
  opacity: 0.1;
  animation: handlePulse 2s infinite;
}

@keyframes handlePulse {
  0% { transform: scale(1); opacity: 0.2; }
  100% { transform: scale(1.5); opacity: 0; }
}

.handle-inner {
  font-size: 2rem;
  color: #000;
  animation: phoneShake 2s infinite;
}

@keyframes phoneShake {
  0% { transform: rotate(0); }
  5% { transform: rotate(10deg); }
  10% { transform: rotate(-10deg); }
  15% { transform: rotate(10deg); }
  20% { transform: rotate(0); }
}

.swipe-hint {
  position: absolute;
  width: 100%;
  left: 0;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.2);
  pointer-events: none;
  text-transform: uppercase;
  z-index: 0;
}


.arrow {
  vertical-align: middle;
  animation: arrowSlide 1s infinite alternate;
}

/* Active Controls */
.controls-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 35px;
}

.control-btn {
  width: 65px;
  height: 65px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  color: white;
}

.control-btn.active {
  background: #ffbf00;
  color: black;
  box-shadow: 0 0 20px rgba(255, 191, 0, 0.4);
  border-color: #ffbf00;
}

.control-btn.hangup {
  background: #ff4757;
  width: 75px;
  height: 75px;
  border: none;
  box-shadow: 0 10px 30px rgba(255, 71, 87, 0.4);
}

.control-btn:active {
  transform: scale(0.9);
}

.hangup-icon {
  transform: rotate(135deg);
}

.ringing-text {
  position: absolute;
  bottom: -35px;
  font-size: 0.85rem;
  font-weight: 800;
  color: #ffbf00;
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
}

.hidden-audio {
  display: none;
}

/* Animation Trigger Bar */
.animation-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 15px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 191, 0, 0.2);
  border-radius: 28px;
  margin-top: 25px;
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.animation-bar::-webkit-scrollbar {
  display: none;
}


.anim-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  min-width: 60px;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.anim-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));
}

.anim-label {
  font-size: 0.6rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.anim-trigger:active {
  transform: scale(1.3) translateY(-5px);
}

/* Bee Particles */
.bee-particle {
  position: absolute;
  font-size: 1.5rem;
  pointer-events: none;
  z-index: 10;
  text-shadow: 0 0 10px rgba(255, 191, 0, 0.5);
}

.particle-fade-enter-active {
  animation: particleFloat 1.5s forwards ease-out;
}

.spin-anim {
  animation: continuousSpin 0.5s infinite linear !important;
}

@keyframes continuousSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes particleFloat {
  0% { transform: translate(0, 0) scale(0.5) rotate(0); opacity: 0; }
  20% { opacity: 1; transform: translate(var(--x), var(--y)) scale(1.2) rotate(20deg); }
  100% { transform: translate(calc(var(--x) * 1.5), calc(var(--y) * 1.5)) scale(0.8) rotate(45deg); opacity: 0; }
}


@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>

