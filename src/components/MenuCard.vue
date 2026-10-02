<template>
  <div class="menu-card">
    <van-cell-group>
      <slot />
    </van-cell-group>
  </div>
</template>

<style scoped>
.menu-card {
  overflow: hidden;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-card);
}
.menu-card :deep(.van-cell-group) { margin: 0; background: transparent; }
.menu-card :deep(.van-cell) { background: transparent; }
</style>
