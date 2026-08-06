<script setup lang="ts">
/**
 * 空状态引导：首次进入、当前筛选无笔记或未选中笔记时使用。
 */
defineProps<{
  title: string;
  description?: string;
  actionLabel?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="empty-state">
    <!-- 纸页 + 笔尖装饰，强化手帐意象 -->
    <div class="empty-state__mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 10.5h18.5a3 3 0 0 1 3 3V36a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V10.5Z"
          stroke="currentColor"
          stroke-width="1.8"
          opacity="0.35"
        />
        <path
          d="M16 17h12M16 22.5h10M16 28h8"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          opacity="0.4"
        />
        <path
          d="M28.5 30.5 38 13.8a1.6 1.6 0 0 1 2.2-.6l.9.55a1.6 1.6 0 0 1 .55 2.2L32.2 33.5l-4.4 1.2 0.7-4.2Z"
          fill="currentColor"
        />
      </svg>
    </div>
    <h2 class="empty-state__title">{{ title }}</h2>
    <p v-if="description" class="empty-state__desc">{{ description }}</p>
    <button v-if="actionLabel" type="button" class="btn btn--primary" @click="emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>
