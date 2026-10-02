<template>
  <main class="page detail-page" :aria-busy="loading">
    <PageNavBar :title="'服务 #' + id" back-to="/" prefer-history />
    <PageState v-if="loading" type="loading" message="加载服务详情…" />
    <PageState v-else-if="loadError" type="error" :message="loadError" action-text="重试" @action="loadDetail" />
    <div v-else class="detail-content">
      <MenuCard>
          <van-cell title="日期" :value="detail.service_date" />
          <van-cell title="开始" :value="formatTime(detail.start_time)" :is-link="detail.status !== 'cancelled'" @click="detail.status !== 'cancelled' && openTimeEdit()" />
          <van-cell title="结束" :value="formatTime(detail.end_time) || '—'" :is-link="detail.status === 'completed'" @click="detail.status === 'completed' && openTimeEdit()" />
          <van-cell title="状态" :value="detail.status === 'completed' ? '已完成' : (detail.status === 'cancelled' ? '已取消' : detail.status)" />
          <van-cell v-if="detail.referred_bonus > 0" title="点钟" :value="'是（奖励 ' + formatMoney(detail.referred_bonus) + '）'" />
      </MenuCard>
      <div class="section-title">项目明细</div>
      <article v-for="item in detail.items" :key="item.item_id" class="card service-item-card">
          <div class="service-item-copy">
            <div class="service-item-name">{{ item.project_name }}</div>
            <div class="service-item-meta">
              <template v-if="item.duration_minutes">{{ item.duration_minutes }}分钟 · </template>{{ item.work_hours }}h
            </div>
          </div>
          <div class="service-item-actions">
            <div class="detail-amount detail-amount--medium">{{ formatMoney(item.income) }}</div>
            <van-button v-if="detail.status === 'completed'" plain type="danger" size="small" icon="delete-o" @click="confirmDeleteItem(item)">删除</van-button>
          </div>
      </article>
      <div v-if="detail.referred_bonus > 0" class="card bonus-card">
        <div><div class="detail-label">点钟奖励</div><div class="detail-meta">客人点名</div></div>
        <div class="detail-amount detail-amount--medium bonus-value">{{ formatMoney(detail.referred_bonus) }}</div>
      </div>

      <van-dialog v-model:show="showTimeDialog" title="编辑服务时间" show-cancel-button :before-close="saveTime">
        <div class="time-editor">
          <van-field v-model="startTimeText" label="开始时间" type="time" input-align="right" />
          <van-field v-if="detail.status === 'completed'" v-model="endTimeText" label="结束时间" type="time" input-align="right" />
          <div class="time-editor-tip">时间仅作记录，不影响服务时长、计薪工时和收入。</div>
          <p v-if="timeError" class="form-error" role="alert">{{ timeError }}</p>
        </div>
      </van-dialog>

      <button v-if="detail.remark" type="button" class="card remark-card" :disabled="detail.status === 'cancelled'" @click="openRemarkEdit()">
        <div class="remark-copy">
          <div class="detail-label"><van-icon name="notes-o" /> 备注</div>
          <div class="remark-text">{{ detail.remark }}</div>
        </div>
        <van-icon v-if="detail.status !== 'cancelled'" name="edit" color="var(--c-primary)" class="remark-edit-icon" />
      </button>
      <van-button v-else-if="detail.status !== 'cancelled'" type="primary" plain size="small" icon="edit" class="add-remark" @click="openRemarkEdit">添加备注</van-button>

      <van-dialog v-model:show="showRemarkDialog" title="编辑备注" show-cancel-button :before-close="saveRemark">
        <div class="remark-editor">
          <van-field v-model="remarkText" type="textarea" rows="3" maxlength="100" show-word-limit placeholder="记录客人偏好或特殊情况" />
        </div>
      </van-dialog>
      <div class="card total-card">
        <div><div class="detail-label">合计</div><div class="detail-meta">{{ detail.total_work_hours }}h</div></div>
        <div class="detail-amount detail-amount--large">{{ formatMoney(detail.total_income) }}</div>
      </div>

      <div class="danger-zone">
        <van-button v-if="detail.status === 'completed'" type="danger" block @click="confirmDelete">删除此记录</van-button>
      </div>
    </div>

    <van-dialog v-model:show="showDelete" title="确认删除" message="删除后数据不可恢复" show-cancel-button @confirm="doDelete" />
    <van-dialog v-model:show="showDeleteItem" title="确认删除明细" message="删除后会重算合计；如需增加项目，请重新记录整次服务" show-cancel-button @confirm="doDeleteItem" />
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getService, deleteService, deleteServiceItem, updateServiceRemark, updateServiceTime } from '../services/records'
import { formatMoney, formatTime } from '../utils/format'
import MenuCard from '../components/MenuCard.vue'
import PageNavBar from '../components/PageNavBar.vue'
import PageState from '../components/PageState.vue'
import { useFeedback } from '../composables/useFeedback'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const loading = ref(true)
const loadError = ref('')
const detail = ref({ items: [] })
const showDelete = ref(false)
const showDeleteItem = ref(false)
const deleteTarget = ref(null)
const feedback = useFeedback()

// 服务时间编辑：时间只作记录，不参与工资计算。
const showTimeDialog = ref(false)
const startTimeText = ref('')
const endTimeText = ref('')
const timeError = ref('')
const openTimeEdit = () => {
  timeError.value = ''
  startTimeText.value = formatTime(detail.value.start_time)
  endTimeText.value = formatTime(detail.value.end_time)
  showTimeDialog.value = true
}
const saveTime = async (action) => {
  if (action !== 'confirm') return true
  timeError.value = ''
  if (!startTimeText.value) {
    timeError.value = '请选择开始时间'
    return false
  }
  if (detail.value.status === 'completed' && !endTimeText.value) {
    timeError.value = '请选择结束时间'
    return false
  }
  if (endTimeText.value && endTimeText.value <= startTimeText.value) {
    timeError.value = '结束时间必须晚于开始时间'
    return false
  }
  try {
    const payload = { start_time: startTimeText.value }
    if (detail.value.status === 'completed') payload.end_time = endTimeText.value
    const updated = await updateServiceTime(id, payload)
    detail.value.start_time = updated.start_time
    detail.value.end_time = updated.end_time
    feedback.success('服务时间已更新')
    return true
  } catch (e) {
    feedback.error(e.message || '时间更新失败')
    return false
  }
}

// 备注编辑
const showRemarkDialog = ref(false)
const remarkText = ref('')
const openRemarkEdit = () => {
  remarkText.value = detail.value.remark || ''
  showRemarkDialog.value = true
}
const saveRemark = async (action) => {
  if (action === 'confirm') {
    try {
      await updateServiceRemark(id, remarkText.value.trim())
      detail.value.remark = remarkText.value.trim()
      feedback.success('备注已保存')
    } catch (e) {
      feedback.error(`保存失败：${e.message}`)
      return false
    }
  }
  return true
}

const loadDetail = async () => {
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await getService(id) || { items: [] }
  } catch (error) {
    loadError.value = error.message || '加载服务详情失败'
  } finally { loading.value = false }
}
onMounted(loadDetail)

const confirmDelete = () => { showDelete.value = true }
const doDelete = async () => {
  try {
    await deleteService(id)
    await router.replace('/')
    feedback.success('服务记录已删除')
  } catch (e) { feedback.error(e.message || '删除失败') }
}

const confirmDeleteItem = (item) => { deleteTarget.value = item; showDeleteItem.value = true }
const doDeleteItem = async () => {
  try {
    await deleteServiceItem(id, deleteTarget.value.item_id)
    feedback.success('项目已删除')
    await refreshDetail()
  } catch (e) { feedback.error(e.message || '删除失败') }
}

const refreshDetail = async () => {
  try { detail.value = await getService(id) }
  catch (error) { feedback.error(error.message || '刷新服务详情失败') }
}

</script>

<style scoped>
.detail-page { padding-top: 0; }
.detail-content { padding-top: var(--space-3); }
.time-editor { padding:8px 16px 14px; }
.time-editor-tip { padding:8px 0 0; color:var(--c-text-3); font-size:12px; line-height:1.5; }
.service-item-card { display:flex; align-items:center; justify-content:space-between; gap:var(--space-3); }
.service-item-copy { min-width:0; }
.service-item-name, .detail-label { color:var(--c-text); font-weight:700; }
.service-item-meta, .detail-meta { margin-top:2px; color:var(--c-text-3); font-size:var(--text-sm); }
.service-item-actions { display:flex; flex:0 0 auto; align-items:center; gap:10px; }
.detail-amount { color:var(--c-income-text); font-weight:700; font-variant-numeric:tabular-nums; }
.detail-amount--medium { font-size:18px; }
.detail-amount--large { font-size:24px; }
.bonus-card { display:flex; justify-content:space-between; align-items:center; }
.bonus-value { color:var(--c-bonus); }
.remark-card { display:flex; width:100%; justify-content:space-between; align-items:center; color:var(--c-text); background:var(--c-primary-tint); text-align:left; }
.remark-card:disabled { cursor:default; opacity:1; }
.remark-copy { flex:1; min-width:0; }
.remark-text { margin-top:var(--space-1); color:var(--c-text-2); font-size:13px; line-height:1.5; overflow-wrap:anywhere; }
.remark-edit-icon { margin-left:var(--space-3); }
.add-remark { margin-bottom:var(--space-3); }
.remark-editor { padding:var(--space-4); }
.total-card { display:flex; justify-content:space-between; align-items:center; background:var(--c-income-soft); }
.danger-zone { margin-top:var(--space-5); }
</style>
