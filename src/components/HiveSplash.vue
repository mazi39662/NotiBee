<template>
  <transition name="fade">
    <div v-if="show" class="hive-splash">
      <div class="splash-content animate-in">
        <div class="large-avatar-hex splash-logo">
          <div class="hexagon hex-glow">
            <img src="/assets/logo-removebg.png" alt="NotiBee Logo" class="splash-logo-img" />
          </div>
        </div>
        <!-- <h1 class="splash-title">NotiBee</h1> -->
        <div class="splash-loader">
          <div class="loader-bar"></div>
        </div>
        <p class="splash-status">{{ statusText }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  statusText?: string;
}>();
</script>

<script lang="ts">
export default {
  inheritAttrs: false
}
</script>

<style scoped>
.hive-splash {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--ion-background-color-rgb), 0.5);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.splash-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.large-avatar-hex {
  width: 100px;
  height: 110px;
  margin-bottom: 20px;
}

.hexagon {
  width: 100%;
  height: 100%;
  background: var(--ion-color-primary);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
  color: black;
}

.hex-glow {
  filter: drop-shadow(0 0 15px rgba(255, 191, 0, 0.6));
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(255, 191, 0, 0.6)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(255, 191, 0, 0.8)); }
  100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(255, 191, 0, 0.6)); }
}

.splash-logo-img {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.splash-title {
  color: var(--ion-text-color);
  font-size: 28px;
  font-weight: 800;
  margin: 0;
  letter-spacing: 1px;
}

.splash-loader {
  width: 200px;
  height: 4px;
  background: rgba(255, 191, 0, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.loader-bar {
  height: 100%;
  width: 30%;
  background: var(--ion-color-primary);
  border-radius: 10px;
  animation: loading-slide 1.5s infinite ease-in-out;
  box-shadow: 0 0 15px var(--ion-color-primary);
}

@keyframes loading-slide {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(150%); }
  100% { transform: translateX(-100%); }
}

.splash-status {
  color: #777;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* Animations */
.animate-in {
  opacity: 0;
  transform: translateY(20px);
  animation: slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
