<template>
  <div class="bee-composite-stage" :style="customStyle">
    <div class="bee-wrapper-internal" :class="{ 'is-buzzing': animated }">
      <!-- Wings Layer (Behind) -->
      <div class="bee-wings-layer">
         <div class="wing-slot-comp">
          <img src="/assets/bee assets/wing_right.png" alt="wing" class="wing-img-comp right-wing" :class="{ 'is-animated': animated }" />
        </div>
        <div class="wing-slot-comp">
          <img src="/assets/bee assets/wing_left.png" alt="wing" class="wing-img-comp left-wing" :class="{ 'is-animated': animated }" />
        </div>
       
      </div>

      <!-- Body Layer -->
      <div class="bee-body-layer">
        <img src="/assets/bee assets/bee_body.png" alt="body" class="bee-body-main" />
        
        <!-- Eyes Layer -->
        <img v-if="customization.eyes === 'none' || !customization.eyes" src="/assets/bee assets/bee_eyes.png" alt="eyes" class="bee-eyes-main" />
        <img v-else :src="`/assets/bee assets/eyes/${customization.eyes}.png`" alt="eyes" class="bee-eyes-main" />
        
        <!-- Accessory Overlays -->
        <div v-if="customization.top === 'glasses'" class="bee-head-overlay">
          <img src="/assets/bee assets/eyeglass.png" alt="glasses" class="bee-acc-img" />
        </div>

        <div v-if="customization.top === 'shades'" class="bee-head-overlay">
           <img src="/assets/bee assets/shades.png" alt="shades" class="bee-acc-img" />
        </div>

        <div v-if="customization.top === 'hat'" class="bee-head-overlay">
          <img src="/assets/bee assets/hat.png" alt="hat" class="bee-acc-img" />
        </div>

        <div v-if="customization.top === 'cowboy'" class="bee-head-overlay">
          <img src="/assets/bee assets/cowboyhat.png" alt="cowboy hat" class="bee-acc-img" />
        </div>

        <div v-if="customization.top === 'straw'" class="bee-head-overlay">
          <img src="/assets/bee assets/strawhat.png" alt="straw hat" class="bee-acc-img" />
        </div>

        <div v-if="customization.top === 'crown'" class="bee-head-overlay">
          <img src="/assets/bee assets/crown.png" alt="crown" class="bee-acc-img" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  customization?: { top?: string; body?: string; eyes?: string };
  animated?: boolean;
  scale?: number;
  flipped?: boolean;
}>();

const customization = computed(() => ({
  top: props.customization?.top || 'none',
  body: props.customization?.body || 'none',
  eyes: props.customization?.eyes || 'none'
}));

const customStyle = computed(() => {
  const scale = props.scale || 1;
  const flip = props.flipped ? -1 : 1;
  return {
    transform: `scale(${scale * flip}, ${scale})`,
    transformOrigin: 'center center'
  };
});
</script>

<style scoped>
.bee-composite-stage {
  position: relative;
  width: 220px !important;
  height: 220px !important;
  min-width: 220px;
  min-height: 220px;
  flex-shrink: 0;
  display: block;
  pointer-events: none;
  overflow: visible !important;
}

.bee-wrapper-internal {
  width: 100%;
  height: 100%;
  position: relative;
}

.is-buzzing {
  animation: comp-hover-float 2s infinite ease-in-out;
}

@keyframes comp-hover-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.bee-wings-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 35px;
  left: 35px;
  z-index: 1;
}

.wing-img-comp {
  width: 150px;
  height: auto;
  opacity: 0.9;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
  max-width: none !important;
}

.wing-img-comp.is-animated.left-wing {
  animation: bee-flap-left 0.1s infinite alternate ease-in-out;
}
.wing-img-comp.is-animated.right-wing {
  animation: bee-flap-right 0.1s infinite alternate ease-in-out;
}

.wing-slot-comp {
  position: absolute;
  z-index: 1;
}

.wing-slot-comp.left {
  top: 40px;
  left: 30px; 
  transform-origin: bottom right;
}

.wing-slot-comp.right {
  top: 40px;
  left: 110px;
  transform-origin: bottom left;
}

@keyframes bee-flap-left {
  from { transform: rotate(15deg); }
  to { transform: rotate(-20deg); }
}

@keyframes bee-flap-right {
  from { transform: rotate(-15deg); }
  to { transform: rotate(20deg); }
}

.bee-body-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 2;
}

.bee-body-main {
  position: absolute;
  width: 150px;
  height: auto;
  top: 50%;
  left: 35px; /* Centers 150px body in 220px stage */
  transform: translateY(-50%);
  z-index: 2;
  filter: drop-shadow(0 8px 12px rgba(0,0,0,0.25));
  max-width: none !important;
}

.bee-eyes-main {
  position: absolute;
  width: 150px;
  height: auto;
  top: 50%;
  left: 35px;
  transform: translateY(-50%);
  z-index: 3;
  pointer-events: none;
  max-width: none !important;
}

.bee-head-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 4;
}

.bee-acc-img {
  position: absolute;
  width: 150px;
  height: auto;
  top: 50%;
  left: 35px;
  transform: translateY(-50%);
  pointer-events: none;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
  max-width: none !important;
}
</style>
