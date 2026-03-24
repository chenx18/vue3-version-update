<template>
  <div class="version-update-indicator" :title="indicatorTitle" @click="requestVersionUpdate">
    <span class="version-update-indicator__dot"></span>
    <span class="version-update-indicator__text">{{ indicatorText }}</span>
  </div>
</template>

<script setup lang="ts">
import { useVersionUpdate } from './service'

const { requestVersionUpdate, indicatorText, indicatorTitle } = useVersionUpdate()
</script>

<style scoped lang="scss">
.version-update-indicator {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #f59e0b;
  border-radius: 14px;
  background: #fff7ed;
  color: #b45309;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #ffedd5;
    border-color: #ea580c;
  }
}

.version-update-indicator__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.16);
}

.version-update-indicator__text {
  white-space: nowrap;
  font-weight: 600;
}
</style>
