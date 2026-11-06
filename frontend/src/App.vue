<template>
  <router-view></router-view>

  <!-- Global Non-Blocking Toast Notifications -->
  <div class="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[100] flex flex-col gap-2 pointer-events-none">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        @click="dismissToast(toast.id)"
        :class="[
          'pointer-events-auto px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 cursor-pointer backdrop-blur-md transition-all text-sm font-bold',
          toast.type === 'error'
            ? 'bg-red-600/95 text-white border-red-500'
            : toast.type === 'warning'
              ? 'bg-amber-500/95 text-white border-amber-400'
              : 'bg-brand-600/95 text-white border-brand-500'
        ]"
      >
        <span class="text-lg shrink-0">
          {{ toast.type === 'error' ? '⚠️' : toast.type === 'warning' ? '🔔' : '✅' }}
        </span>
        <span class="flex-1 leading-snug">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { toasts, dismissToast } from './utils/helpers'
</script>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.96);
}
</style>
