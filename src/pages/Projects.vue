<template>
  <SettingsPageShell title="项目管理" description="控制服务项目是否出现在录入流程中；停用不会改变历史记录。">
    <PageState v-if="loading" type="loading" message="加载服务项目…" />
    <PageState v-else-if="loadError" type="error" :message="loadError" action-text="重试" @action="loadProjects" />
    <PageState v-else-if="!projects.length" type="empty" title="暂无服务项目" message="当前没有可管理的服务项目。" />
    <template v-else>
      <MenuCard>
        <van-cell v-for="p in projects" :key="p.project_id" center>
          <template #title>
            <div class="project-title">{{ p.name }} <span>{{ p.category_label }}</span></div>
            <div class="project-detail">{{ durationSummary(p) }}</div>
          </template>
          <template #right-icon>
            <van-switch v-model="p.status" :active-value="1" :inactive-value="0" size="22" :disabled="isPending(p.project_id)" @change="toggle(p)" />
          </template>
        </van-cell>
      </MenuCard>
    </template>
  </SettingsPageShell>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getProjects, updateProject } from '../services/rules'
import SettingsPageShell from '../components/SettingsPageShell.vue'
import MenuCard from '../components/MenuCard.vue'
import PageState from '../components/PageState.vue'
import { useFeedback } from '../composables/useFeedback'

const loading = ref(true)
const loadError = ref('')
const projects = ref([])
const pendingIds = ref(new Set())
const feedback = useFeedback()

const durationSummary = (project) => {
  const durations = project.durations || []
  if (!durations.length) return project.category === 'extra_income' ? '固定收入，不计工时' : '固定时长'
  if (durations.length === 1) return `${durations[0]}分钟`
  return `${durations[0]}–${durations[durations.length - 1]}分钟 · 每15分钟一档`
}

const loadProjects = async () => {
  loading.value = true
  loadError.value = ''
  try { projects.value = await getProjects() || [] }
  catch (error) { loadError.value = error.message || '加载服务项目失败' }
  finally { loading.value = false }
}

const isPending = (projectId) => pendingIds.value.has(projectId)
onMounted(loadProjects)

const toggle = async (project) => {
  if (isPending(project.project_id)) return
  const previousStatus = project.status === 1 ? 0 : 1
  pendingIds.value = new Set([...pendingIds.value, project.project_id])
  try {
    await updateProject(project.project_id, { status: project.status })
    feedback.success(`${project.name}已${project.status ? '启用' : '停用'}`)
  } catch (e) {
    project.status = previousStatus
    feedback.error(`操作失败：${e.message}`)
  } finally {
    const remaining = new Set(pendingIds.value)
    remaining.delete(project.project_id)
    pendingIds.value = remaining
  }
}
</script>

<style scoped>
.project-title { color: var(--c-text); font-weight: 600; }
.project-title span { margin-left: 6px; color: var(--c-text-3); font-size: var(--text-xs); font-weight: 400; }
.project-detail { margin-top: 3px; color: var(--c-text-3); font-size: var(--text-sm); }
</style>
