<template>
  <div class="audio-bubble-wrapper" :class="{ 'is-own': isOwn, 'has-bee': isPlaying }">
    <!-- Talking Bee UI with Sonic Waves -->
    <div v-if="isPlaying" class="talking-bee-outer animate-pop">
      <div class="sonic-waves">
        <div class="wave" v-for="i in 3" :key="i" :style="waveStyle(i)"></div>
      </div>
      <div class="bee-speech-bubble premium-glow">
        <div class="bee-container" :style="beeTransform">
          <BeeComposite 
            :customization="customization" 
            :animated="true" 
            :scale="0.35"
          />
        </div>
      </div>
    </div>

    <div class="audio-bubble-container" :class="{ 'is-playing': isPlaying }">
      <!-- Play Button with Progress Ring -->
      <div class="play-btn-wrapper">
        <svg class="progress-ring" viewBox="0 0 40 40">
            <circle class="ring-bg" cx="20" cy="20" r="18" fill="none" />
            <circle 
                class="ring-progress" 
                cx="20" cy="20" r="18" 
                fill="none" 
                :style="{ strokeDashoffset: ringOffset }"
            />
        </svg>
        <button class="play-btn" @click="togglePlay" :disabled="isLoading">
            <ion-spinner v-if="isLoading" name="crescent" color="dark"></ion-spinner>
            <ion-icon v-else :icon="isPlaying ? pause : play"></ion-icon>
        </button>
      </div>
      
      <div class="waveform-container" ref="waveformRef">
        <canvas ref="canvasRef" class="waveform-canvas"></canvas>
        <div class="waveform-glow" :style="{ left: progressPercentage + '%' }"></div>
      </div>

      <div class="audio-info">
        <span class="duration">{{ formatDuration(currentTime || duration) }}</span>
      </div>

      <audio 
        ref="audioRef" 
        :src="activeSrc" 
        @timeupdate="onTimeUpdate" 
        @ended="onEnded"
        @waiting="onWaiting"
        @playing="onPlaying"
        @loadedmetadata="onLoadedMetadata"
        crossorigin="anonymous"
        preload="auto"
      ></audio>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import { IonIcon, IonSpinner } from '@ionic/vue';
import { play, pause } from 'ionicons/icons';
import { useAudioService } from '@/services/AudioService';
import BeeComposite from './BeeComposite.vue';
import { useUserService } from '@/services/UserService';

const props = defineProps<{
  src: string;
  duration: number;
  msgId?: string;
  isOwn?: boolean;
  customization?: { top: string, body: string, eyes: string };
}>();

const { getLocalAudio, saveAudioLocally } = useAudioService();
const { userBeeId } = useUserService();
const audioRef = ref<HTMLAudioElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isPlaying = ref(false);
const isLoading = ref(false);
const currentTime = ref(0);
const progressPercentage = ref(0);
const bars = ref<{h: number, offset: number}[]>([]);
const localUrl = ref<string | null>(null);
const isCaching = ref(false);

// Animation / Audio Analysis
const audioCtx = ref<AudioContext | null>(null);
const analyser = ref<AnalyserNode | null>(null);
const source = ref<MediaElementAudioSourceNode | null>(null);
const animationFrame = ref<number | null>(null);
const currentVolume = ref(0);
const activeSrc = ref(props.src);

const customization = computed(() => {
    if (props.customization) return props.customization;
    if (props.isOwn) {
        const stored = localStorage.getItem('bee_customization');
        if (stored) return JSON.parse(stored);
    }
    return { top: 'none', body: 'none', eyes: 'none' };
});

const ringOffset = computed(() => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    return circumference - (progressPercentage.value / 100) * circumference;
});

const waveStyle = (i: number) => {
    const delay = i * 0.2;
    const size = 1 + (currentVolume.value * 1.5);
    return {
        animationDelay: `${delay}s`,
        opacity: Math.max(0, currentVolume.value - (i * 0.2)),
        transform: `scale(${size})`
    };
};

onMounted(async () => {
    if (props.msgId) {
        const cached = await getLocalAudio(props.msgId);
        if (cached) {
            localUrl.value = cached;
            activeSrc.value = cached;
        } else {
            startBackgroundCaching();
        }
    }
    generateRandomBars();
    window.addEventListener('resize', drawWaveform);
    requestAnimationFrame(idleAnimateWaveform);
});

const beeTransform = computed(() => {
    if (!isPlaying.value) return { transform: 'scale(1)', transformOrigin: 'bottom center' };
    
    // Rhythmic oscillation 
    const time = Date.now() / 120;
    const vol = Math.max(0, currentVolume.value);
    
    // Alternating stretch (thinner/taller) and squash (wider/shorter)
    // High volume increases the amplitude of the dance
    const osc = Math.sin(time);
    
    // scaleY is height: 1.0 is normal, > 1 is stretch, < 1 is squash
    const stretchFactor = 1 + (osc * 0.3 * vol);
    // scaleX is width: inverse of height to conserve volume
    const squashFactor = 1 / stretchFactor;
    
    // Vertical jump based on volume + subtle rhythmic hop
    const jump = -vol * 35 - (Math.abs(Math.cos(time)) * 10 * vol);
    
    // Subtle tilt based on rhythm
    const tilt = Math.cos(time * 0.5) * vol * 20;
    
    return {
        transform: `translateY(${jump}px) rotate(${tilt}deg) scale(${squashFactor}, ${stretchFactor})`,
        transformOrigin: 'bottom center',
    };
});

const setupAudioAnalysis = () => {
    if (audioCtx.value || !audioRef.value) return;
    try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtx.value = new AudioContextClass();
        analyser.value = audioCtx.value!.createAnalyser();
        analyser.value.fftSize = 128;
        source.value = audioCtx.value!.createMediaElementSource(audioRef.value);
        source.value.connect(analyser.value);
        analyser.value.connect(audioCtx.value!.destination);
    } catch (e) { console.warn(e); }
};

const analyzeAudio = () => {
    if (!analyser.value || !isPlaying.value) return;
    const dataArray = new Uint8Array(analyser.value.frequencyBinCount);
    analyser.value.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    currentVolume.value = sum / (dataArray.length * 128);
    drawWaveform();
    animationFrame.value = requestAnimationFrame(analyzeAudio);
};

const idleAnimateWaveform = () => {
    if (isPlaying.value) return;
    bars.value.forEach(bar => {
        bar.offset += 0.02;
    });
    drawWaveform();
    requestAnimationFrame(idleAnimateWaveform);
};

const generateRandomBars = () => {
  const count = 40;
  bars.value = Array.from({ length: count }, () => ({
      h: Math.random() * 0.6 + 0.2,
      offset: Math.random() * Math.PI * 2
  }));
};

const drawWaveform = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const barWidth = 2.5;
  const gap = 1.5;
  const progressX = (progressPercentage.value / 100) * width;

  ctx.clearRect(0, 0, width, height);

  bars.value.forEach((bar, i) => {
    const x = i * (barWidth + gap);
    if (x > width) return;
    
    let activeH = bar.h;
    if (isPlaying.value) {
        // Make bars react to volume based on their position
        const distToProgress = Math.abs(x - progressX) / width;
        const reactivity = Math.max(0, 1 - distToProgress * 5);
        activeH = bar.h * (1 + currentVolume.value * 2 * reactivity);
    } else {
        // Subtle wave animation when idle
        activeH = bar.h * (1 + Math.sin(bar.offset) * 0.1);
    }

    const barHeight = Math.min(height, activeH * height);
    const y = (height - barHeight) / 2;
    const radius = 1.5;

    // Draw Background Bar
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, radius);
    ctx.fillStyle = props.isOwn ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    // Draw Progress Bar
    if (x < progressX) {
      ctx.beginPath();
      const fillWidth = Math.min(barWidth, progressX - x);
      ctx.roundRect(x, y, fillWidth, barHeight, radius);
      ctx.fillStyle = props.isOwn ? '#000000' : '#ffbf00';
      ctx.fill();
    }
  });
};

const startBackgroundCaching = async () => {
    if (isCaching.value || !props.msgId || localUrl.value) return;
    isCaching.value = true;
    try {
        const resp = await fetch(props.src);
        const blob = await resp.blob();
        await saveAudioLocally(props.msgId!, blob);
        localUrl.value = URL.createObjectURL(blob);
    } catch (e) { console.warn(e); } finally { isCaching.value = false; }
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const togglePlay = async () => {
  if (!audioRef.value) return;
  if (isPlaying.value) {
    audioRef.value.pause();
    isPlaying.value = false;
  } else {
    try {
        if (!audioCtx.value) setupAudioAnalysis();
        if (audioCtx.value?.state === 'suspended') await audioCtx.value.resume();
        await audioRef.value.play();
        isPlaying.value = true;
        analyzeAudio();
    } catch (err) { console.error(err); }
  }
};

const onTimeUpdate = () => {
  if (!audioRef.value) return;
  currentTime.value = audioRef.value.currentTime;
  progressPercentage.value = (audioRef.value.currentTime / audioRef.value.duration) * 100;
  drawWaveform();
};

const onEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
  progressPercentage.value = 0;
  currentVolume.value = 0;
  if (animationFrame.value) cancelAnimationFrame(animationFrame.value);
  requestAnimationFrame(idleAnimateWaveform);
};

const onWaiting = () => { isLoading.value = true; };
const onPlaying = () => { isLoading.value = false; };
const onLoadedMetadata = () => {};

onUnmounted(() => {
  window.removeEventListener('resize', drawWaveform);
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
  if (animationFrame.value) cancelAnimationFrame(animationFrame.value);
  if (audioCtx.value) audioCtx.value.close();
});
</script>

<style scoped>
.audio-bubble-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin: 10px 0;
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.audio-bubble-wrapper.has-bee {
    margin-top: 85px;
}

/* Talking Bee UI Enhancements */
.talking-bee-outer {
    position: absolute;
    top: -85px; 
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    pointer-events: none;
}

.bee-speech-bubble {
    background: linear-gradient(135deg, #ffbf00, #ffcc33);
    width: 70px;
    height: 70px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(255, 191, 0, 0.4);
    border: 3px solid rgba(255, 255, 255, 0.4);
    position: relative;
    z-index: 2;
}

.premium-glow::after {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    background: radial-gradient(circle, #ffbf00 0%, transparent 70%);
    opacity: 0.5;
    z-index: -1;
    animation: pulse-glow 2s infinite ease-in-out;
}

@keyframes pulse-glow {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.2); opacity: 0.5; }
}

.sonic-waves {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 120px;
    height: 120px;
}

.wave {
    position: absolute;
    inset: 0;
    border: 2px solid #ffbf00;
    border-radius: 50%;
    animation: sonic-wave 2s infinite linear;
}

@keyframes sonic-wave {
    0% { transform: scale(0.5); opacity: 0; }
    50% { opacity: 0.4; }
    100% { transform: scale(2); opacity: 0; }
}



.bee-container {
    width: 90px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.08s ease-out;
}

/* Audio Bubble Container Enhancements */
.audio-bubble-container {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(25px);
  padding: 10px 15px;
  border-radius: 24px;
  min-width: 220px;
  max-width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.is-own .audio-bubble-container {
    background: linear-gradient(135deg, #ffbf00, #ff9900);
    border: 1px solid rgba(255, 255, 255, 0.25);
}

.is-playing .audio-bubble-container {
    transform: scale(1.02);
    border-color: #ffbf00;
    box-shadow: 0 12px 40px rgba(255, 191, 0, 0.2);
}

/* Play Button Progress Ring */
.play-btn-wrapper {
    position: relative;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.progress-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}

.ring-bg {
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 2px;
}

.is-own .ring-bg {
    stroke: rgba(0, 0, 0, 0.1);
}

.ring-progress {
    stroke: #ffbf00;
    stroke-width: 2.5px;
    stroke-linecap: round;
    stroke-dasharray: 113.1; /* 2 * PI * 18 */
    transition: stroke-dashoffset 0.1s linear;
}

.is-own .ring-progress {
    stroke: #000;
}

.play-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ffbf00;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.2s;
}

.is-own .play-btn {
    background: #000;
    color: #ffbf00;
}

.play-btn:active {
    transform: scale(0.9);
}

.play-btn ion-icon {
  font-size: 22px;
}

/* Waveform Enhancements */
.waveform-container {
  position: relative;
  flex: 1;
  height: 40px;
  overflow: visible;
}

.waveform-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.waveform-glow {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 20px;
    background: radial-gradient(circle, rgba(255, 191, 0, 0.4) 0%, transparent 70%);
    pointer-events: none;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.3s;
}

.is-playing .waveform-glow {
    opacity: 1;
}

.audio-info {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 800;
    font-family: 'Outfit', sans-serif;
    min-width: 40px;
}

.is-own .audio-info {
    color: rgba(0, 0, 0, 0.6);
}

/* Animations */
.animate-pop {
    animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop-in {
    0% { transform: translateX(-50%) scale(0.5) translateY(30px); opacity: 0; }
    100% { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
}
</style>
