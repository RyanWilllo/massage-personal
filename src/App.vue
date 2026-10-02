<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="pageKey" />
      </transition>
    </router-view>
    <van-tabbar
      v-if="showTabbar"
      :model-value="active"
      active-color="var(--c-primary)"
      inactive-color="var(--c-text-3)"
      border
      safe-area-inset-bottom
    >
      <van-tabbar-item icon="home-o" @click="go('/')">首页</van-tabbar-item>
      <van-tabbar-item icon="chart-trending-o" @click="go('/statistics')">统计</van-tabbar-item>
      <van-tabbar-item icon="setting-o" @click="go('/more')">更多</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const showTabbar = computed(() => Boolean(route.meta.showTabbar))
const pageKey = computed(() => route.fullPath)

const active = computed(() => {
  if (route.path === '/') return 0
  if (route.path === '/statistics') return 1
  return 2
})

const go = (path) => {
  if (route.path !== path) router.push(path)
}
</script>

<style scoped>
.app-container {
  width: min(100%, var(--app-content-max-width));
  min-height: 100vh;
  margin: 0 auto;
  padding-bottom: calc(50px + env(safe-area-inset-bottom));
  background: var(--c-bg);
}
@media (min-width: 768px) {
  .app-container {
    min-height: calc(100vh - 32px);
    margin-top: 16px;
    margin-bottom: 16px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-page);
    overflow: hidden;
    box-shadow: var(--shadow-card);
  }
}
.fade-enter-active, .fade-leave-active { transition:opacity .16s ease, transform .16s ease; }
.fade-enter-from { opacity:0; transform:translateY(4px); }
.fade-leave-to { opacity:0; transform:translateY(-2px); }
</style>
