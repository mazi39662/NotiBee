<template>
  <div class="audio-bubble-container" :class="{ 'is-playing': isPlaying }">
    <button class="play-btn" @click="togglePlay" :disabled="isLoading">
      <ion-spinner v-if="isLoading" name="crescent" color="dark"></ion-spinner>
      <ion-icon v-else :icon="isPlaying ? pause : play"></ion-icon>
    </button>
    
    <div class="waveform-container" ref="waveformRef">
      <canvas ref="canvasRef" class="waveform-canvas"></canvas>
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
      preload="auto"
    ></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import { IonIcon, IonSpinner } from '@ionic/vue';
import { play, pause } from 'ionicons/icons';
import { useAudioService } from '@/services/AudioService';

const props = defineProps<{
  src: string;
  duration: number;
  msgId?: string;
  isOwn?: boolean;
}>();

const { getLocalAudio, saveAudioLocally } = useAudioService();
const audioRef = ref<HTMLAudioElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isPlaying = ref(false);
const isLoading = ref(false);
const currentTime = ref(0);
const progressPercentage = ref(0);
const bars = ref<number[]>([]);
const localUrl = ref<string | null>(null);
const isCaching = ref(false);

const activeSrc = ref(props.src);

onMounted(async () => {
    if (props.msgId) {
        const cached = await getLocalAudio(props.msgId);
        if (cached) {
            localUrl.value = cached;
            activeSrc.value = cached;
        } else {
            // Start caching in background immediately
            startBackgroundCaching();
        }
    }
  generateRandomBars();
  window.addEventListener('resize', drawWaveform);
  drawWaveform();
});

const startBackgroundCaching = async () => {
    if (isCaching.value || !props.msgId || localUrl.value) return;
    isCaching.value = true;
    try {
        const resp = await fetch(props.src);
        const blob = await resp.blob();
        await saveAudioLocally(props.msgId!, blob);
        // We don't update activeSrc here to avoid interrupting current playback if already started
        localUrl.value = URL.createObjectURL(blob);
    } catch (e) {
        console.warn('Background caching failed', e);
    } finally {
        isCaching.value = false;
    }
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
        await audioRef.value.play();
        isPlaying.value = true;
    } catch (err) {
        console.error('Playback failed', err);
    }
  }
};

const onTimeUpdate = () => {
  if (!audioRef.value) return;
  currentTime.value = audioRef.value.currentTime;
  progressPercentage.value = (audioRef.value.currentTime / audioRef.value.duration) * 100;
};

const onEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
  progressPercentage.value = 0;
};

const onWaiting = () => {
    isLoading.value = true;
};

const onPlaying = () => {
    isLoading.value = false;
};

const onLoadedMetadata = () => {
  // Metadata ready
};

const generateRandomBars = () => {
  const count = 30;
  bars.value = Array.from({ length: count }, () => Math.random() * 0.8 + 0.2);
  drawWaveform();
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

  const barWidth = 3;
  const gap = 2;
  const barCount = Math.floor(width / (barWidth + gap));

  if (bars.value.length === 0) {
    bars.value = Array.from({ length: barCount }, () => Math.random() * 0.7 + 0.1);
  }

  ctx.clearRect(0, 0, width, height);
  const progressX = (progressPercentage.value / 100) * width;

  bars.value.forEach((val, i) => {
    const x = i * (barWidth + gap);
    if (x > width) return;
    
    const barHeight = val * height;
    const y = (height - barHeight) / 2;
    
    ctx.fillStyle = props.isOwn ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x, y, barWidth, barHeight);

    if (x < progressX) {
      ctx.fillStyle = props.isOwn ? '#000000' : '#ffbf00';
      const fillWidth = Math.min(barWidth, progressX - x);
      ctx.fillRect(x, y, fillWidth, barHeight);
    }
  });
};

watch(progressPercentage, drawWaveform);

onUnmounted(() => {
  window.removeEventListener('resize', drawWaveform);
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
});
</script>

<style scoped>
.audio-bubble-container {
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
  padding: 8px 12px;
  border-radius: 14px;
  min-width: 180px;
  max-width: 100%;
}

.play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ffbf00;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(255, 191, 0, 0.4);
}

.play-btn ion-icon {
  font-size: 18px;
}

.play-btn ion-spinner {
  width: 18px;
  height: 18px;
}

.play-btn:disabled {
  opacity: 0.8;
  cursor: wait;
}

.waveform-container {
  position: relative;
  flex: 1;
  height: 30px;
  overflow: hidden;
}

.waveform-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.audio-info {
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    font-weight: 600;
}
</style>
