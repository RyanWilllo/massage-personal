<template>
  <van-popup v-model:show="showPicker" position="bottom" round @closed="openReferredAfterPicker">
    <div class="record-picker">
      <div class="record-picker-title">{{ serviceDate === localDate() ? '记录今日服务' : '补录 ' + serviceDate + ' 服务' }}</div>
      <PageState v-if="projectsLoading" type="loading" message="加载服务项目…" compact />
      <PageState
        v-else-if="projectLoadError"
        type="error"
        :message="projectLoadError"
        action-text="重试"
        compact
        @action="retryLoadProjects"
      />
      <template v-else>
        <div class="column-title">服务项目（可多选）</div>
        <div class="project-list">
          <div v-for="project in mains" :key="project.project_id" class="project-row">
            <button type="button" class="project-choice" :class="{ active: isSelected(project.project_id) }" @click="toggleProject(project)">
              <van-icon :name="isSelected(project.project_id) ? 'checked' : 'circle'" />
              <span>{{ project.name }}</span>
              <small v-if="isSelected(project.project_id) && project.durations?.length">{{ selectedDuration(project.project_id) }}分钟</small>
              <small v-else-if="isSelected(project.project_id)">固定30分钟</small>
            </button>
            <button
              v-if="isSelected(project.project_id) && project.durations?.length"
              type="button"
              class="duration-chip"
              @click="openDurationPicker(project)"
            >
              {{ selectedDuration(project.project_id) }} 分钟
              <van-icon name="arrow-down" />
            </button>
          </div>
        </div>
        <div class="picker-summary" aria-live="polite">{{ selectionSummary || '请选择项目' }}</div>
        <div class="record-picker-actions">
          <van-button type="primary" block :disabled="!canContinue" @click="goToReferred">下一步</van-button>
        </div>
      </template>
    </div>
  </van-popup>

  <van-action-sheet v-model:show="showDuration" :title="activeDurationProject ? activeDurationProject.name + '时长' : '选择时长'">
    <div class="duration-picker">
      <button
        v-for="duration in (activeDurationProject?.durations || [])"
        :key="duration"
        type="button"
        class="duration-choice"
        :class="{ active: activeDurationProject && selectedDuration(activeDurationProject.project_id) === duration }"
        @click="chooseDuration(duration)"
      >{{ duration }}分钟</button>
    </div>
  </van-action-sheet>

  <van-action-sheet v-model:show="showReferred" title="点钟与备注" @closed="submitting = false">
    <div class="referred-picker">
      <div class="referred-picker-content">
        <div class="flow-selection-summary" aria-live="polite">
          <span>已选项目</span>
          <strong :title="selectionSummary">{{ selectionSummary }}</strong>
        </div>

        <section v-if="!hasExclusiveProject" class="flow-section" aria-label="附加项目">
          <div class="flow-section-title">附加项目</div>
          <div class="flow-option-list">
            <button
              v-for="extra in availableExtras"
              :key="extra.project_id"
              type="button"
              class="flow-option"
              :class="{ active: selectedExtras.includes(extra.project_id) }"
              :aria-pressed="selectedExtras.includes(extra.project_id)"
              @click="toggleExtra(extra.project_id)"
            >
              <span>{{ extra.name }}</span>
              <van-icon v-if="selectedExtras.includes(extra.project_id)" name="success" />
            </button>
          </div>
        </section>
        <div v-else class="home-addon-tip">上门服务不可搭配升级精油或热敷包</div>

        <section class="flow-section" aria-label="点钟">
          <div class="flow-section-title">点钟</div>
          <div class="flow-option flow-option--switch">
            <span>客人点钟</span>
            <van-switch v-model="isReferred" size="20" />
          </div>
        </section>

        <section class="flow-section flow-section--remark" aria-label="备注">
          <div class="flow-section-title">备注（可选）</div>
          <div class="remark-card">
            <van-field v-model="remark" type="textarea" rows="2" maxlength="100" show-word-limit placeholder="例：点钟老客，偏好热敷" />
          </div>
        </section>
      </div>
      <div class="referred-picker-actions">
        <van-button type="primary" block :loading="submitting" :disabled="submitting || !canContinue" @click="submit">确认提交</van-button>
      </div>
    </div>
  </van-action-sheet>

  <van-overlay :show="submitting" class="submit-overlay-layer"><div class="submit-overlay"><van-loading size="32px" color="var(--c-on-primary)" text-color="var(--c-on-primary)" vertical>提交中…</van-loading></div></van-overlay>

  <transition name="banner-slide">
    <button v-if="banner" type="button" class="result-banner" aria-label="关闭服务已记录提示" @click="dismissBanner">
      <div class="banner-icon"><van-icon name="checked" color="var(--c-on-primary)" /></div>
      <div class="banner-body">
        <div class="banner-title">服务已记录</div>
        <div class="banner-detail">
          <span class="banner-income">{{ banner.income }}</span>
          <span class="banner-hours">{{ banner.hours }}h</span>
          <van-tag v-if="banner.isReferred" type="danger" plain size="small" class="banner-tag">点钟</van-tag>
        </div>
      </div>
    </button>
  </transition>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getAvailableProjects, quickService } from '../services/records'
import { useFeedback } from '../composables/useFeedback'
import { formatMoney } from '../utils/format'
import { localDate } from '../utils/date'
import PageState from './PageState.vue'

const emit = defineEmits(['submitted'])
const showPicker = ref(false)
const showDuration = ref(false)
const showReferred = ref(false)
const pendingReferred = ref(false)
const submitting = ref(false)
const mains = ref([])
const extras = ref([])
const projectsLoading = ref(false)
const projectLoadError = ref('')
const serviceDate = ref('')
const selectedProjectIds = ref([])
const durationsByProject = ref({})
const activeDurationProject = ref(null)
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
  return `${project.name}${duration}`
}).join(' + '))
const canContinue = computed(() => selectedProjects.value.length > 0 && selectedProjects.value.every(project => {
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
  if (isSelected(project.project_id)) {
    selectedProjectIds.value = selectedProjectIds.value.filter(id => id !== project.project_id)
    return
  }
  if (project.exclusive) selectedProjectIds.value = []
  else selectedProjectIds.value = selectedProjectIds.value.filter(id => !mains.value.find(p => p.project_id === id)?.exclusive)
  if (project.durations?.length && !durationsByProject.value[project.project_id]) {
    durationsByProject.value = { ...durationsByProject.value, [project.project_id]: defaultDuration(project) }
  }
  selectedProjectIds.value = [...selectedProjectIds.value, project.project_id]
}

const openDurationPicker = (project) => {
  activeDurationProject.value = project
  showDuration.value = true
}
const chooseDuration = (duration) => {
  if (!activeDurationProject.value) return
  durationsByProject.value = {
    ...durationsByProject.value,
    [activeDurationProject.value.project_id]: duration,
  }
  showDuration.value = false
}

const open = async (date = localDate()) => {
  if (!date || date > localDate()) {
    feedback.warning('不能记录未来日期')
    return
  }
  serviceDate.value = date
  pendingReferred.value = false
  selectedProjectIds.value = []
  durationsByProject.value = {}
  selectedExtras.value = []
  isReferred.value = false
  remark.value = ''
  showPicker.value = true
  if (await loadProjects(true)) applyDefaultProject()
}
defineExpose({ open })

const goToReferred = () => { pendingReferred.value = true; showPicker.value = false }
const openReferredAfterPicker = () => {
  if (!pendingReferred.value) return
  pendingReferred.value = false
  showReferred.value = true
}
const toggleExtra = (id) => {
  if (hasExclusiveProject.value) return
  selectedExtras.value = selectedExtras.value.includes(id)
    ? selectedExtras.value.filter(projectId => projectId !== id)
    : [...selectedExtras.value, id]
}
const submit = async () => {
  if (submitting.value || !canContinue.value) return
  submitting.value = true
  try {
    const payload = { service_items: serviceItems.value, service_date: serviceDate.value, referred: isReferred.value }
    if (selectedExtras.value.length && !hasExclusiveProject.value) {
      payload.addons = selectedExtras.value.map(project_id => ({ project_id }))
    }
    if (remark.value.trim()) payload.remark = remark.value.trim()
    const result = await quickService(payload)
    showReferred.value = false
    showResultBanner(result)
    emit('submitted', { ...result, serviceDate: serviceDate.value })
  } catch (error) {
    feedback.error(`提交失败：${error.message}`)
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
</script>

<style scoped>
.record-picker { max-height:calc(85vh - env(safe-area-inset-bottom)); overflow-y:auto; padding:18px 16px 0; background:var(--c-card); }
.record-picker-title { font-weight:700; text-align:center; margin-bottom:16px; font-size:16px; }
.column-title { padding:4px 0 8px; color:var(--c-text-2); font-size:13px; font-weight:600; }
.project-list { display:grid; gap:8px; }
.project-row { display:flex; align-items:center; gap:8px; min-height:52px; padding:4px 8px; border:1px solid var(--c-border); border-radius:var(--r-inner); background:var(--c-bg); }
.project-choice { display:flex; flex:1; min-width:0; min-height:44px; align-items:center; gap:8px; border:0; border-radius:var(--r-inner); color:var(--c-text); background:transparent; font-size:15px; text-align:left; }
.project-choice .van-icon { color:var(--c-text-3); font-size:20px; }
.project-choice.active { color:var(--c-primary); font-weight:700; }
.project-choice.active .van-icon { color:var(--c-primary); }
.project-choice small { margin-left:auto; color:var(--c-text-3); font-size:12px; font-weight:400; white-space:nowrap; }
.duration-chip { display:flex; align-items:center; gap:2px; min-height:44px; padding:0 8px; border:1px solid var(--c-border); border-radius:var(--r-inner); color:var(--c-primary); background:var(--c-card); font-size:12px; white-space:nowrap; }
.picker-summary { min-height:22px; text-align:center; color:var(--c-text-2); padding:14px 0; font-weight:500; font-size:13px; }
.record-picker-actions { position:sticky; bottom:0; z-index:1; padding:12px 0 max(18px, env(safe-area-inset-bottom)); border-top:1px solid var(--c-border); background:var(--c-card); }
.duration-picker { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; padding:12px 16px max(18px, env(safe-area-inset-bottom)); }
.duration-choice { min-height:44px; border:1px solid var(--c-border); border-radius:var(--r-inner); color:var(--c-text); background:var(--c-card); font-size:14px; }
.duration-choice.active { border-color:var(--c-primary); color:var(--c-primary); background:var(--c-primary-soft); font-weight:700; }
.referred-picker { max-height:calc(85vh - env(safe-area-inset-bottom)); overflow-y:auto; padding:18px 16px 0; background:var(--c-card); }
.referred-picker-content { padding-bottom:16px; }
.referred-picker-actions { position:sticky; bottom:0; z-index:1; padding:12px 0 max(18px, env(safe-area-inset-bottom)); border-top:1px solid var(--c-border); background:var(--c-card); }
.flow-selection-summary { display:flex; align-items:baseline; gap:8px; margin-bottom:16px; padding:10px 12px; border:1px solid var(--c-border); border-radius:var(--r-inner); color:var(--c-text-2); background:var(--c-bg); font-size:12px; }
.flow-selection-summary span { flex-shrink:0; color:var(--c-text-3); }
.flow-selection-summary strong { min-width:0; overflow:hidden; color:var(--c-text); font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
.flow-section { margin-bottom:16px; }
.flow-section--remark { margin-bottom:0; }
.flow-section-title { padding:0 4px 8px; color:var(--c-text-2); font-size:13px; font-weight:600; }
.flow-option-list { display:grid; gap:8px; }
.flow-option { display:flex; width:100%; min-height:52px; padding:0 14px; align-items:center; justify-content:space-between; border:1px solid var(--c-border); border-radius:var(--r-inner); color:var(--c-text); background:var(--c-bg); font-size:15px; text-align:left; }
.flow-option.active { border-color:var(--c-primary); color:var(--c-primary); background:var(--c-primary-soft); font-weight:600; }
.flow-option .van-icon { color:var(--c-primary); }
.flow-option--switch { cursor:default; }
.remark-card { overflow:hidden; border:1px solid var(--c-border); border-radius:var(--r-inner); background:var(--c-bg); }
.remark-card :deep(.van-cell) { background:transparent; }
.remark-card :deep(.van-field__word-limit) { color:var(--c-text-3); }
.home-addon-tip { margin:0 0 16px; padding:11px 12px; border:1px solid var(--c-border); border-radius:var(--r-inner); color:var(--c-text-2); background:var(--c-bg); font-size:13px; }
.submit-overlay-layer { background: var(--c-overlay); }
.submit-overlay { display:flex; height:100%; align-items:center; justify-content:center; }
.result-banner { position:fixed; left:16px; right:16px; bottom:calc(16px + env(safe-area-inset-bottom)); z-index:2100; display:flex; max-width:calc(var(--app-content-max-width) - 32px); align-items:center; gap:12px; margin-inline:auto; padding:14px 16px; color:var(--c-text); background:var(--c-card); border:1px solid var(--c-border); border-radius:var(--r-card); box-shadow:var(--shadow-float); text-align:left; }
.banner-icon { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:var(--c-success); flex-shrink:0; }
.banner-body { flex:1; min-width:0; }
.banner-title { font-size:13px; font-weight:600; color:var(--c-text-2); }
.banner-detail { display:flex; align-items:center; margin-top:3px; }
.banner-income { font-size:20px; font-weight:700; color:var(--c-income); font-variant-numeric:tabular-nums; }
.banner-hours { font-size:13px; color:var(--c-text-3); margin-left:8px; font-variant-numeric:tabular-nums; }
.banner-tag { margin-left:6px; }
.banner-slide-enter-active, .banner-slide-leave-active { transition:opacity .25s ease, transform .25s ease; }
.banner-slide-enter-from, .banner-slide-leave-to { opacity:0; transform:translateY(16px); }
</style>
