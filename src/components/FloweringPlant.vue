<template>
  <div class="flower-component" :style="containerStyle" :class="['flower--' + actualType, { 'is-active': active }]">
    
    <!-- Magical Grass (Directly from User Code) -->
    <div v-if="withGrass" class="grass-elements">
      <!-- <div class="growing-grass">
        <div class="flower__grass" :class="'flower__grass--' + ((seed > 0.5) ? '1' : '2')">
          <div class="flower__grass--top"></div>
          <div class="flower__grass--bottom"></div>
          <div v-for="i in 8" :key="i" :class="['flower__grass__leaf', `flower__grass__leaf--${i}`]"></div>
          <div class="flower__grass__overlay"></div>
        </div>
      </div> -->

      <!-- Randomized Long Grass Variations -->
      <div v-for="i in grassVariationCount" :key="i" class="grow-ans" :style="getGrassVariationStyle(i)">
        <div class="flower__g-right" :class="[`flower__g-right--${i}`, { 'is-flipped': (i + Math.floor(seed * 3)) % 2 === 0 }]">
          <div class="leaf"></div>
        </div>
      </div>
    </div>

    <!-- Main Flower Structure (Strict Centering) -->
    <div class="flower" 
         @dblclick="handleDoubleTap" 
         :class="{ 'is-shaking': isInteracting }">
      <div class="flower__leafs" :class="'flower__leafs--' + actualType">
        <div v-for="i in 4" :key="i" :class="['flower__leaf', `flower__leaf--${i}`]"></div>
        <div class="flower__white-circle"></div>

        <!-- Flying Lights -->
        <div v-for="i in 8" :key="i" :class="['flower__light', `flower__light--${i}`]"></div>
      </div>
      
      <div class="flower__line" :style="{ height: stemHeight }">
        <div v-for="i in 3" :key="i" :class="['flower__line__leaf', `flower__line__leaf--${i}`]"></div>
      </div>
    </div>

    
    <div class="fade-overlay"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  x?: string;
  y?: string;
  scale?: number;
  active?: boolean;
  delay?: string;
  color?: string;
  withGrass?: boolean;
  type?: number; // 1, 2, or 3 matching original code
  seed?: number;
}>();

const actualType = computed(() => props.type || 1);
const seed = computed(() => props.seed || 0.5);

const stemHeight = computed(() => {
  if (actualType.value === 1) return '65vmin';
  if (actualType.value === 2) return '55vmin';
  return '50vmin';
});

const grassVariationCount = computed(() => {
  return 2; // More leaves, but constrained to center
});

const getGrassVariationStyle = (index: number) => {
  const rotation = (index % 2 === 0) ? 5 + (index * 3) : -5 - (index * 3); // Tighter rotation
  const scale = 0.8 + (seed.value * 0.3);
  return {
    left: '50%',
    transform: `translateX(-50%) rotate(${rotation}deg) scale(${scale})`,
    zIndex: 5 - index, // Layering
  };
};

const containerStyle = computed(() => ({
  left: props.x || '50%',
  bottom: props.y || '-2vmin', // Lower base below the tab line
  transform: `scale(${props.scale || 1})`,
  '--fl-delay': props.delay || '0s',
  '--flower-color-main': props.color || '#ffdb4d', 
  '--flower-color-dark': '#b28900',
  '--flower-color-line': '#e6a800',
  '--grass-color': '#0c9707',
}));

const isInteracting = ref(false);

const handleDoubleTap = () => {
  if (isInteracting.value) return;
  isInteracting.value = true;
  setTimeout(() => {
    isInteracting.value = false;
  }, 600);
};
</script>

<style scoped>
/* BASE STYLES */
.flower-component {
  position: absolute;
  transform-origin: bottom center;
  z-index: 1; /* Stay behind bees and UI */
  pointer-events: none;
}

.flower-component:not(.is-active) * {
  animation-play-state: paused !important;
  opacity: 0 !important;
}

.flower {
  position: absolute;
  bottom: -80px; /* Moved down: just above tabs */
  left: 50%;
  transform: translateX(-50%);
  transform-origin: bottom center;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto; /* Enable interaction */
  cursor: pointer;
}

.flower.is-shaking {
  animation: flower-shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes flower-shake {
  10%, 90% { transform: translateX(-50%) rotate(-1deg); }
  20%, 80% { transform: translateX(-50%) rotate(2deg); }
  30%, 50%, 70% { transform: translateX(-50%) rotate(-4deg); }
  40%, 60% { transform: translateX(-50%) rotate(4deg); }
}

/* Centering Logic - EXACTLY from your code */
.flower--1 { animation: moving-flower-1 4s linear infinite; animation-delay: var(--fl-delay); }
.flower--2 { transform: rotate(20deg); animation: moving-flower-2 4s linear infinite; animation-delay: var(--fl-delay) }
.flower--3 { transform: rotate(-15deg); animation: moving-flower-3 4s linear infinite; animation-delay: var(--fl-delay) }

.flower__leafs {
  position: relative;
  animation: blooming-flower 2s backwards;
  animation-delay: calc(var(--fl-delay) + 1s);
}

.flower__leaf {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 8vmin;
  height: 11vmin;
  border-radius: 51% 49% 47% 53% / 44% 45% 55% 69%;
  background-color: var(--flower-color-main);
  background-image: linear-gradient(to top, var(--flower-color-dark), var(--flower-color-main));
  transform-origin: bottom center;
  opacity: 0.9;
  box-shadow: inset 0 0 2vmin rgba(255, 255, 255, 0.5);
}

/* Petal Positing - Strict matching */
.flower__leaf--1 { transform: translate(-10%, 1%) rotateY(40deg) rotateX(-50deg); }
.flower__leaf--2 { transform: translate(-50%, -4%) rotateX(40deg); }
.flower__leaf--3 { transform: translate(-90%, 0%) rotateY(45deg) rotateX(50deg); }
.flower__leaf--4 {
  width: 8vmin; height: 8vmin;
  transform-origin: bottom left;
  border-radius: 4vmin 10vmin 4vmin 4vmin;
  transform: translate(-0%, 18%) rotateX(70deg) rotate(-43deg);
  background-image: linear-gradient(to top, var(--flower-color-line), var(--flower-color-main));
  z-index: 1;
}

.flower__white-circle {
  position: absolute;
  left: -3.5vmin;
  top: -3vmin;
  width: 7vmin;
  height: 3.5vmin;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 0 2vmin var(--flower-color-main);
}

.flower__white-circle::after {
  content: "";
  position: absolute;
  left: 50%; top: 45%;
  transform: translate(-50%, -50%);
  width: 60%; height: 60%;
  border-radius: inherit;
  background-image: linear-gradient(90deg, #ffeb12, #ffce00);
}

/* LINE / STEM */
.flower__line {
  width: 1.5vmin;
  background-image: linear-gradient(to left, rgba(0,0,0,0.2), transparent, rgba(255,255,255,0.2)),
                    linear-gradient(to top, transparent 50%, #0c97076e, var(--flower-color-line));
  animation: grow-flower-tree 4s backwards;
  animation-delay: var(--fl-delay);
}

.flower__line__leaf {
  --w: 7vmin; --h: calc(var(--w) + 2vmin);
  position: absolute;
  width: var(--w); height: var(--h);
  background-image: linear-gradient(to top, rgba(20, 117, 122, 0.4), var(--flower-color-line));
  animation: blooming-leaf-right 1s backwards;
}

.flower__line__leaf--1 { top: 20%; left: 90%; transform: rotate(70deg) rotateY(30deg); animation-delay: calc(var(--fl-delay) + 3.6s); border-top-right-radius: var(--h); border-bottom-left-radius: var(--h); }
.flower__line__leaf--2 { top: 45%; left: 90%; transform: rotate(70deg) rotateY(30deg); animation-delay: calc(var(--fl-delay) + 3.4s); border-top-right-radius: var(--h); border-bottom-left-radius: var(--h); }
.flower__line__leaf--3 { top: 12%; left: -460%; transform: rotate(-70deg) rotateY(30deg); animation-delay: calc(var(--fl-delay) + 3.2s); border-top-left-radius: var(--h); border-bottom-right-radius: var(--h); }
.flower__line__leaf--4 { top: 40%; left: -460%; transform: rotate(-70deg) rotateY(30deg); animation-delay: calc(var(--fl-delay) + 3.0s); border-top-left-radius: var(--h); border-bottom-right-radius: var(--h); }

/* GRASS - EXACT RADIUS & COLORS */
.flower__grass {
  --c: #159faa;
  --line-w: 1.5vmin;
  position: absolute;
  bottom: 0vmin;
  left: -7vmin;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 20;
  transform-origin: bottom center;
  transform: rotate(-48deg) rotateY(40deg);
}

.flower__grass--1 { animation: moving-grass 2s linear infinite; }
.flower__grass--2 { left: 2vmin; transform: scale(0.5) rotate(75deg) rotateX(10deg) rotateY(-200deg); opacity: 0.8; }

.flower__grass--top {
  width: 7vmin; height: 10vmin;
  border-top-right-radius: 100%;
  border-right: var(--line-w) solid var(--c);
  transform: rotate(-2deg);
}

.flower__grass--bottom {
  margin-top: -2px;
  width: var(--line-w); height: 25vmin;
  background-image: linear-gradient(to top, transparent, var(--c));
  animation: grow-flower-tree 4s backwards;
  animation-delay: var(--fl-delay);
}

.flower__g-long__bottom {
  width: var(--w); height: 40vmin;
  background-image: linear-gradient(to top, transparent 20%, var(--c));
  clip-path: polygon(35% 0, 65% 1%, 100% 100%, 0% 100%);
  animation: grow-flower-tree 4s backwards;
  animation-delay: var(--fl-delay);
}

.flower__grass__leaf {
  --size: 10vmin;
  position: absolute;
  width: calc(var(--size) * 2.1); height: var(--size);
  border-top-left-radius: var(--size); border-top-right-radius: var(--size);
  background-image: linear-gradient(to top, transparent, transparent 30%, var(--c));
  z-index: 100;
}

.flower__grass__leaf--1 { top: -6%; left: 30%; --size: 6vmin; transform: rotate(-20deg); }
.flower__grass__leaf--2 { top: -5%; left: -110%; --size: 6vmin; transform: rotate(10deg); }

/* G-RIGHT MASKING */
.flower__g-right {
  position: absolute;
  bottom: 0;
  left: 0; /* Centered anchor */
  transform-origin: bottom center;
}

.flower__g-right .leaf {
  width: 12vmin; height: 40vmin; /* Narrower to avoid button overlap */
  border-top-left-radius: 100%;
  border-left: 2vmin solid #32812f;
  background-image: linear-gradient(to bottom, transparent, #07970775 100%);
  -webkit-mask-image: linear-gradient(to top, transparent 30%, #079097 100%);
  animation: grow-flower-tree 4s backwards;
  animation-delay: var(--fl-delay);
}

.flower__g-right.is-flipped {
  transform: rotateY(180deg);
  transform-origin: bottom center;
}

.flower__light {
  position: absolute;
  bottom: 0vmin;
  width: 0.8vmin; height: 0.8vmin;
  background-color: rgb(255, 251, 0);
  border-radius: 50%;
  animation: light-ans 4s linear infinite backwards;
}

/* KEYFRAMES */
@keyframes moving-flower-1 { 0%, 100% { transform: rotate(2deg); } 50% { transform: rotate(-2deg); } }
@keyframes moving-flower-2 { 0%, 100% { transform: rotate(22deg); } 50% { transform: rotate(18deg); } }
@keyframes moving-flower-3 { 0%, 100% { transform: rotate(-13deg); } 50% { transform: rotate(-17deg); } }
@keyframes blooming-flower { 0% { transform: scale(0); } }
@keyframes grow-flower-tree { 0% { height: 0; } }
@keyframes blooming-leaf-right { 0% { transform: rotate(70deg) rotateY(30deg) scale(0); } }
@keyframes light-ans {
  0% { opacity: 0; transform: translateY(0vmin); }
  25% { opacity: 1; transform: translateY(-5vmin) translateX(-2vmin); }
  50% { opacity: 1; transform: translateY(-15vmin) translateX(2vmin); }
  100% { transform: translateY(-30vmin); opacity: 0; }
}
@keyframes moving-grass { 0%, 100% { transform: rotate(-48deg) rotateY(40deg); } 50% { transform: rotate(-50deg) rotateY(40deg); } }

.growing-grass {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.grow-ans {
  position: absolute;
  bottom: -25vmin; /* Pushed down to start from very bottom */
  left: 50%;
  width: 0;
  display: flex;
  justify-content: center;
  transform-origin: bottom center;
}

.fade-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 15vmin;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  z-index: 5;
  pointer-events: none;
}
</style>
