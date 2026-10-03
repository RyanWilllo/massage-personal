<template>
  <MenuCard>
    <van-cell title="历史记录" :value="`${months.reduce((n, m) => n + m.service_count, 0)} 条`" />
    <van-cell v-if="!months.length" title="旧系统本人暂无已完成记录" />
    <van-cell v-for="month in months" :key="month.month" :title="month.month" :value="formatMoney(month.income)" :label="`${month.service_count} 条记录 · ${month.item_count} 个明细 · ${month.work_minutes} 计薪分钟`" />
  </MenuCard>
</template>
<script setup>
import MenuCard from './MenuCard.vue'
import { formatMoney } from '../utils/format.js'
defineProps({ months: { type: Array, required: true } })
</script>
