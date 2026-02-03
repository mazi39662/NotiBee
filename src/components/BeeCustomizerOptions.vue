<template>
  <div class="controls-section">
    <div class="category-tabs">
      <div 
        class="cat-tab" 
        :class="{ active: activeCategory === 'top' }" 
        @click="$emit('update:activeCategory', 'top')"
      >
        Accessories
      </div>
      <div 
        class="cat-tab" 
        :class="{ active: activeCategory === 'eyes' }" 
        @click="$emit('update:activeCategory', 'eyes')"
      >
        Eyes
      </div>
    </div>

    <div class="options-grid glass-panel">
      <!-- Top Options (Accessories) -->
      <template v-if="activeCategory === 'top'">
        <div 
          class="option-item" 
          :class="{ active: selections.top === 'none' }" 
          @click="updateSelection('top', 'none')"
        >
          <div class="item-preview">🚫</div>
          <span>Default</span>
        </div>
        <div 
          class="option-item" 
          :class="{ active: selections.top === 'glasses' }" 
          @click="updateSelection('top', 'glasses')"
        >
          <div class="item-preview">
            <img src="/assets/bee assets/eyeglass.png" alt="Glasses" class="thumb-img" />
          </div>
          <span>Glasses</span>
        </div>
        <div 
          class="option-item" 
          :class="{ active: selections.top === 'shades' }" 
          @click="updateSelection('top', 'shades')"
        >
          <div class="item-preview">
            <img src="/assets/bee assets/shades.png" alt="Shades" class="thumb-img" />
          </div>
          <span>Shades</span>
        </div>
        <div 
          class="option-item" 
          :class="{ active: selections.top === 'hat' }" 
          @click="updateSelection('top', 'hat')"
        >
          <div class="item-preview">
            <img src="/assets/bee assets/hat.png" alt="Hat" class="thumb-img" />
          </div>
          <span>Top Hat</span>
        </div>
        <div 
          class="option-item" 
          :class="{ active: selections.top === 'cowboy' }" 
          @click="updateSelection('top', 'cowboy')"
        >
          <div class="item-preview">
            <img src="/assets/bee assets/cowboyhat.png" alt="Cowboy Hat" class="thumb-img" />
          </div>
          <span>Cowboy</span>
        </div>
        <div 
          class="option-item" 
          :class="{ active: selections.top === 'straw' }" 
          @click="updateSelection('top', 'straw')"
        >
          <div class="item-preview">
            <img src="/assets/bee assets/strawhat.png" alt="Straw Hat" class="thumb-img" />
          </div>
          <span>Straw Hat</span>
        </div>
        <div 
          class="option-item" 
          :class="{ active: selections.top === 'crown' }" 
          @click="updateSelection('top', 'crown')"
        >
          <div class="item-preview">
            <img src="/assets/bee assets/crown.png" alt="Crown" class="thumb-img" />
          </div>
          <span>Crown</span>
        </div>
      </template>

      <!-- Eyes Options -->
      <template v-if="activeCategory === 'eyes'">
        <div 
          class="option-item" 
          :class="{ active: selections.eyes === 'none' }" 
          @click="updateSelection('eyes', 'none')"
        >
          <div class="item-preview">🚫</div>
          <span>Default</span>
        </div>
        <div 
          v-for="eye in ['angry', 'crying', 'dizzy', 'eh', 'hehe', 'hehehe', 'kawaii', 'meh', 'shock', 'smiley', 'square_eye', 'what', 'x_eye', '._.']"
          :key="eye"
          class="option-item" 
          :class="{ active: selections.eyes === eye }" 
          @click="updateSelection('eyes', eye)"
        >
          <div class="item-preview">
            <img :src="`/assets/bee assets/eyes/${eye}.png`" :alt="eye" class="thumb-img" />
          </div>
          <span>{{ eye.replace('_', ' ') }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selections: { top: string; body: string; eyes: string };
  activeCategory: string;
}>();

const emit = defineEmits(['update:selections', 'update:activeCategory']);

const updateSelection = (category: 'top' | 'body' | 'eyes', value: string) => {
  emit('update:selections', { category, value });
};
</script>

<style scoped>
.controls-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.category-tabs {
  background: var(--glass-bg);
  padding: 5px;
  border-radius: 15px;
  display: flex;
  gap: 5px;
}

.cat-tab {
  flex: 1;
  text-align: center;
  padding: 10px;
  border-radius: 12px;
  font-weight: 700;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.cat-tab.active {
  background: var(--ion-color-primary);
  color: black;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 15px;
  border-radius: 24px;
  background: var(--glass-bg);
}

.option-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.option-item.active {
  background: rgba(255, 191, 0, 0.1);
  border-color: var(--ion-color-primary);
}

.item-preview {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
}

.thumb-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.option-item span {
  font-size: 11px;
  font-weight: 600;
  color: #888;
}

.option-item.active span {
  color: var(--ion-color-primary);
}
</style>
