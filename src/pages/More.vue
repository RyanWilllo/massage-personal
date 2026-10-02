<template>
  <main class="page">
    <PageHeader title="更多" />
    <MenuCard>
      <van-cell title="计薪规则" label="基准时薪、倍率与固定收入" is-link @click="$router.push('/rules')">
        <template #icon><MenuIcon name="balance-list-o" /></template>
      </van-cell>
      <van-cell title="服务项目" label="设置录入时可选的项目" is-link @click="$router.push('/projects')">
        <template #icon><MenuIcon name="apps-o" /></template>
      </van-cell>
      <van-cell title="应用设置" label="本地记录与应用更新" is-link @click="$router.push('/settings')">
        <template #icon><MenuIcon name="setting-o" /></template>
      </van-cell>
    </MenuCard>
  </main>
</template>
<script setup>
import PageHeader from '../components/PageHeader.vue'
import MenuCard from '../components/MenuCard.vue'
import MenuIcon from '../components/MenuIcon.vue'
</script>
