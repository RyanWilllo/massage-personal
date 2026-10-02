<template>
  <van-popup v-model:show="showRecord" position="bottom" round teleport="body" class="record-popup" :style="sheetStyle" :close-on-click-overlay="false">
    <form class="record-sheet" @submit.prevent="submit">
      <header class="record-sheet-header">
        <button type="button" class="sheet-cancel" :disabled="submitting" @click="close">取消</button>
        <h2>{{ serviceDate === localDate() ? '记录服务' : '补录服务' }}</h2>
        <span class="sheet-date">{{ formatDate(serviceDate) }}</span>
      </header>
      <div class="record-sheet-content">
        <PageState v-if="projectsLoading" type="loading" message="加载服务项目…" compact />
        <PageState v-else-if="projectLoadError" type="error" :message="projectLoadError" action-text="重试" compact @action="retryLoadProjects" />
        <fieldset v-else class="record-fields" :disabled="submitting">
          <section class="flow-section">
            <div class="flow-section-heading"><h3>服务项目</h3><span>可多选</span></div>
            <div class="project-list">
              <div v-for="project in mains" :key="project.project_id" class="project-row" :class="{ selected: isSelected(project.project_id) }">
                <div class="project-row-main">
                  <button type="button" class="project-choice" @click="toggleProject(project)">
                    <van-icon :name="isSelected(project.project_id) ? 'checked' : 'circle'" />
                    <span>{{ project.name }}</span>
                    <small v-if="!project.durations?.length">30分钟</small>
                  </button>
                  <button v-if="isSelected(project.project_id) && project.durations?.length" type="button" class="duration-chip" @click="toggleDuration(project.project_id)">
                    {{ selectedDuration(project.project_id) }}分钟
                    <van-icon :name="expandedDurationId === project.project_id ? 'arrow-up' : 'arrow-down'" />
                  </button>
                </div>
                <div v-if="isSelected(project.project_id) && expandedDurationId === project.project_id" class="duration-picker">
                  <button v-for="duration in project.durations" :key="duration" type="button" class="duration-choice" :class="{ active: selectedDuration(project.project_id) === duration }" @click="chooseDuration(project.project_id, duration)">{{ duration }}分钟</button>
                </div>
              </div>
            </div>
          </section>
          <section v-if="!hasExclusiveProject && availableExtras.length" class="flow-section">
            <div class="flow-section-heading"><h3>附加项目</h3><span>可选</span></div>
            <div class="flow-option-list">
              <button v-for="extra in availableExtras" :key="extra.project_id" type="button" class="flow-option" :class="{ active: selectedExtras.includes(extra.project_id) }" @click="toggleExtra(extra.project_id)">
                <span>{{ extra.name }}</span>
                <van-icon :name="selectedExtras.includes(extra.project_id) ? 'checked' : 'circle'" />
              </button>
            </div>
          </section>
          <p v-else-if="hasExclusiveProject" class="form-help exclusive-help">上门服务不可搭配其他项目。</p>
          <section class="flow-section">
            <div class="flow-option flow-option--switch"><span>客人点钟</span><van-switch v-model="isReferred" size="28" :disabled="submitting" /></div>
          </section>
          <section class="flow-section flow-section--remark">
            <div class="flow-section-heading"><h3>备注</h3><span>可选</span></div>
            <div class="remark-card"><van-field ref="remarkField" v-model="remark" type="textarea" rows="2" maxlength="100" show-word-limit :disabled="submitting" placeholder="记录客人偏好或特殊情况" /></div>
          </section>
        </fieldset>
      </div>
      <footer class="record-sheet-actions">
        <div class="picker-summary">{{ selectionSummary || '请选择服务项目' }}</div>
        <van-button native-type="submit" type="primary" block :loading="submitting" loading-text="保存中…" :disabled="submitting || projectsLoading || Boolean(projectLoadError) || !canSave">保存记录</van-button>
      </footer>
    </form>
  </van-popup>

  <transition name="banner-slide">
    <button v-if="banner" type="button" class="result-banner" aria-label="关闭服务已记录提示" @click="dismissBanner">
      <div class="banner-icon"><van-icon name="checked" color="var(--c-on-primary)" /></div>
      <div class="banner-body">
        <div class="banner-title">服务已记录</div>
        <div class="banner-detail">
          <span class="banner-income">{{ banner.income }}</span>
          <span class="banner-hours">{{ banner.hours }}h</span>
          <van-tag v-if="banner.isReferred" type="danger" plain size="small">点钟</van-tag>
        </div>
      </div>
    </button>
  </transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getAvailableProjects, quickService } from '../services/records'
import { useFeedback } from '../composables/useFeedback'
import { useSheetViewport } from '../composables/useSheetViewport'
import { formatDate, formatMoney } from '../utils/format'
import { localDate } from '../utils/date'
import PageState from './PageState.vue'

const emit = defineEmits(['submitted'])
const showRecord = ref(false)
const expandedDurationId = ref(null)
const remarkField = ref(null)
const sheetStyle = useSheetViewport()
const submitting = ref(false)
const mains = ref([])
const extras = ref([])
const projectsLoading = ref(false)
const projectLoadError = ref('')
const serviceDate = ref('')
const selectedProjectIds = ref([])
const durationsByProject = ref({})
const selectedExtras = ref([])
const isReferred = ref(false)
const remark = ref('')
let projectLoadPromise = null
const feedback = useFeedback()

const availableExtras = computed(() => extras.value.filter(project => project.category === 'extra_income'))
const selectedProjects = computed(() => selectedProjectIds.value
  .map(id => mains.value.find(project => project.project_id === id))
  .filter(Boolean))
const hasExclusiveProject = computed(() => selectedProjects.value.some(project => project.exclusive))
const selectedDuration = (projectId) => durationsByProject.value[projectId] || 0
const isSelected = (projectId) => selectedProjectIds.value.includes(projectId)
const selectionSummary = computed(() => selectedProjects.value.map(project => {
  const duration = project.durations?.length ? `${selectedDuration(project.project_id)}分钟` : '30分钟'
  return `${project.name} ${duration}`
}).join(' + '))
const canSave = computed(() => selectedProjects.value.length > 0 && selectedProjects.value.every(project => {
  return !project.durations?.length || project.durations.includes(selectedDuration(project.project_id))
}))
const serviceItems = computed(() => selectedProjects.value.map(project => {
  const item = { project_id: project.project_id }
  if (project.durations?.length) item.duration_minutes = selectedDuration(project.project_id)
  return item
}))

const defaultDuration = (project) => {
  const preferred = project.exclusive ? 90 : (project.project_id === 1 || project.project_id === 2 ? 60 : 30)
  return project.durations?.includes(preferred) ? preferred : project.durations?.[0]
}

const applyDefaultProject = () => {
  if (selectedProjectIds.value.length) return
  const normal = mains.value.find(project => project.project_id === 1) || mains.value.find(project => !project.exclusive) || mains.value[0]
  if (normal) toggleProject(normal)
}

const loadProjects = async (force = false) => {
  if (mains.value.length && !force) return true
  if (projectLoadPromise) return projectLoadPromise
  projectsLoading.value = true
  projectLoadError.value = ''
  const request = (async () => {
    try {
      const available = await getAvailableProjects()
      mains.value = (available || []).filter(project => project.main_eligible === 1)
      extras.value = (available || []).filter(project => project.category === 'extra_income')
      if (!mains.value.length) throw new Error('当前没有可记录的服务项目')
      return true
    } catch (error) {
      projectLoadError.value = error.message || '加载服务项目失败'
      return false
    } finally {
      projectsLoading.value = false
    }
  })()
  projectLoadPromise = request
  try {
    return await request
  } finally {
    if (projectLoadPromise === request) projectLoadPromise = null
  }
}
const retryLoadProjects = async () => {
  if (await loadProjects(true)) applyDefaultProject()
}
onMounted(loadProjects)

const toggleProject = (project) => {
  if (submitting.value) return
  if (isSelected(project.project_id)) {
    selectedProjectIds.value = selectedProjectIds.value.filter(id => id !== project.project_id)
    if (expandedDurationId.value === project.project_id) expandedDurationId.value = null
    return
  }
  if (project.exclusive) {
    selectedProjectIds.value = []
    selectedExtras.value = []
  } else {
    selectedProjectIds.value = selectedProjectIds.value.filter(id => !mains.value.find(p => p.project_id === id)?.exclusive)
  }
  expandedDurationId.value = null
  if (project.durations?.length && !durationsByProject.value[project.project_id]) {
    durationsByProject.value = { ...durationsByProject.value, [project.project_id]: defaultDuration(project) }
  }
  selectedProjectIds.value = [...selectedProjectIds.value, project.project_id]
}

const toggleDuration = (projectId) => {
  if (submitting.value) return
  expandedDurationId.value = expandedDurationId.value === projectId ? null : projectId
}
const chooseDuration = (projectId, duration) => {
  if (submitting.value) return
  durationsByProject.value = { ...durationsByProject.value, [projectId]: duration }
  expandedDurationId.value = null
}

const open = async (date = localDate()) => {
  if (submitting.value || showRecord.value) return
  if (!date || date > localDate()) {
    feedback.warning('不能记录未来日期')
    return
  }
  serviceDate.value = date
  dismissBanner()
  expandedDurationId.value = null
  selectedProjectIds.value = []
  durationsByProject.value = {}
  selectedExtras.value = []
  isReferred.value = false
  remark.value = ''
  showRecord.value = true
  if (await loadProjects(true)) applyDefaultProject()
}
defineExpose({ open })

const close = () => {
  if (submitting.value) return
  remarkField.value?.blur()
  showRecord.value = false
}
const toggleExtra = (id) => {
  if (submitting.value || hasExclusiveProject.value) return
  selectedExtras.value = selectedExtras.value.includes(id)
    ? selectedExtras.value.filter(projectId => projectId !== id)
    : [...selectedExtras.value, id]
}
const submit = async () => {
  if (!showRecord.value || submitting.value || projectsLoading.value || projectLoadError.value || !canSave.value) return
  remarkField.value?.blur()
  submitting.value = true
  try {
    const payload = { service_items: serviceItems.value, service_date: serviceDate.value, referred: isReferred.value }
    if (selectedExtras.value.length && !hasExclusiveProject.value) {
      payload.addons = selectedExtras.value.map(project_id => ({ project_id }))
    }
    if (remark.value.trim()) payload.remark = remark.value.trim()
    const result = await quickService(payload)
    showRecord.value = false
    showResultBanner(result)
    emit('submitted', { ...result, serviceDate: serviceDate.value })
  } catch (error) {
    feedback.error(`保存失败：${error.message}`)
  } finally {
    submitting.value = false
  }
}

const banner = ref(null)
let bannerTimer = null
const showResultBanner = (result) => {
  banner.value = {
    income: formatMoney(result.total_income),
    hours: result.total_work_hours,
    isReferred: isReferred.value,
  }
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => { banner.value = null }, 2500)
}
const dismissBanner = () => { clearTimeout(bannerTimer); banner.value = null }

onBeforeUnmount(() => clearTimeout(bannerTimer))
</script>

<style scoped>

.record-popup { left: 0; right: 0; width: min(100%, var(--app-content-max-width)); margin-inline: auto; padding-bottom: 0; }
.record-sheet { display: flex; flex-direction: column; height: min(720px, var(--sheet-height)); background: var(--c-card); }
.record-sheet-header { display: grid; grid-template-columns: 64px minmax(0, 1fr) 64px; align-items: center; flex-shrink: 0; padding: 6px 12px; border-bottom: 1px solid var(--c-border); }
.record-sheet-header h2 { font-size: 17px; font-weight: 600; text-align: center; }
.sheet-cancel { min-height: 44px; border: 0; color: var(--c-primary); background: transparent; font-size: 16px; text-align: left; }
.sheet-cancel:disabled { opacity: .5; }
.sheet-date { color: var(--c-text-3); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.record-sheet-content { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior-y: contain; padding: 16px; scroll-padding-block: 16px; }
.record-fields { min-width: 0; border: 0; }
.flow-section { margin-bottom: 20px; }
.flow-section--remark { margin-bottom: 0; }
.flow-section-heading { display: flex; align-items: baseline; justify-content: space-between; margin: 0 4px 8px; }
.flow-section-heading h3 { color: var(--c-text); font-size: 16px; font-weight: 600; }
.flow-section-heading span { color: var(--c-text-3); font-size: 14px; }
.project-list, .flow-option-list { display: grid; gap: 8px; }
.project-row { overflow: hidden; padding: 4px 8px; border: 1px solid var(--c-border); border-radius: var(--r-inner); background: var(--c-bg); }
.project-row.selected { border-color: var(--c-primary-border); background: var(--c-primary-tint); }
.project-row-main { display: flex; align-items: center; gap: 4px; }
.project-choice { display: flex; flex: 1; min-width: 0; min-height: 44px; align-items: center; gap: 8px; border: 0; color: var(--c-text); background: transparent; font-size: 16px; text-align: left; }
.project-choice .van-icon { flex-shrink: 0; color: var(--c-text-3); font-size: 22px; }
.selected .project-choice .van-icon { color: var(--c-primary); }
.project-choice small { margin-left: auto; color: var(--c-text-3); font-size: 14px; white-space: nowrap; }
.duration-chip { display: flex; flex-shrink: 0; min-height: 44px; align-items: center; gap: 4px; padding: 0 4px; border: 0; color: var(--c-primary); background: transparent; font-size: 14px; }
.duration-picker { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 8px 0 4px; border-top: 1px solid var(--c-primary-border); }
.duration-choice { min-height: 44px; border: 1px solid var(--c-border); border-radius: var(--r-inner); color: var(--c-text); background: var(--c-card); font-size: 14px; }
.duration-choice.active { border-color: var(--c-primary); color: var(--c-primary); background: var(--c-primary-soft); font-weight: 600; }
.flow-option { display: flex; width: 100%; min-height: 52px; padding: 10px 14px; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--c-border); border-radius: var(--r-inner); color: var(--c-text); background: var(--c-bg); font-size: 16px; text-align: left; }
.flow-option.active { border-color: var(--c-primary-border); background: var(--c-primary-tint); }
.flow-option .van-icon { color: var(--c-primary); font-size: 22px; }
.flow-option--switch { cursor: default; }
.exclusive-help { margin-bottom: 20px; }
.remark-card { overflow: hidden; border: 1px solid var(--c-border); border-radius: var(--r-inner); background: var(--c-bg); }
.remark-card :deep(.van-cell) { background: transparent; }
.record-sheet-actions { flex-shrink: 0; padding: 10px 16px max(12px, env(safe-area-inset-bottom)); border-top: 1px solid var(--c-border); background: var(--c-card); }
.picker-summary { max-height: 3em; overflow-y: auto; margin-bottom: 8px; color: var(--c-text-2); font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
.result-banner { position:fixed; left:16px; right:16px; bottom:calc(66px + env(safe-area-inset-bottom)); z-index:2100; display:flex; max-width:calc(var(--app-content-max-width) - 32px); align-items:center; gap:12px; margin-inline:auto; padding:14px 16px; color:var(--c-text); background:var(--c-card); border:1px solid var(--c-border); border-radius:var(--r-card); box-shadow:var(--shadow-float); text-align:left; }
.banner-icon { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:var(--c-success); flex-shrink:0; }
.banner-body { flex:1; min-width:0; }
.banner-title { font-size:14px; font-weight:600; color:var(--c-text-2); }
.banner-detail { display:flex; flex-wrap:wrap; align-items:center; margin-top:3px; }
.banner-income { font-size:20px; font-weight:700; color:var(--c-income-text); font-variant-numeric:tabular-nums; }
.banner-hours { font-size:14px; color:var(--c-text-3); margin-left:8px; font-variant-numeric:tabular-nums; }
.banner-tag { margin-left:6px; }
.banner-slide-enter-active, .banner-slide-leave-active { transition:opacity .25s ease, transform .25s ease; }
.banner-slide-enter-from, .banner-slide-leave-to { opacity:0; transform:translateY(16px); }

@media (max-width: 359px) { .duration-picker { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
