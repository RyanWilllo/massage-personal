<template>
  <SettingsPageShell title="规则管理" description="设置计薪基准、工时倍率和固定收入。">
    <PageState v-if="loading" type="loading" message="加载规则…" />
    <PageState v-else-if="loadError" type="error" :message="loadError" action-text="重试" @action="loadRules" />
    <template v-else>
      <section class="admin-section">
        <div class="admin-section-heading"><h2>普通推拿基准</h2><span>个人规则</span></div>
        <div class="admin-form-card rule-base">
          <van-field v-model="baseRate" label="每计薪小时收入" type="number" input-align="right">
            <template #button><span class="unit">元</span></template>
          </van-field>
          <p class="form-help">工时型项目按此基准和项目工时倍率线性计算。</p>
          <p v-if="baseError" class="form-error" role="alert">{{ baseError }}</p>
          <van-button type="primary" block :loading="savingBase" :disabled="savingBase" class="rule-save" @click="saveBaseRate">保存基准价</van-button>
        </div>
      </section>

      <section class="admin-section">
        <div class="admin-section-heading"><h2>项目规则</h2><span>历史记录不受影响</span></div>
        <MenuCard>
          <van-cell
            v-for="r in projectRules" :key="r.project_id"
            :title="r.project_name" :label="ruleSummary(r)" :is-link="r.editable"
            @click="editRule(r)"
          />
        </MenuCard>
      </section>
    </template>

    <van-dialog v-model:show="showEdit" :title="'编辑 ' + (editTarget?.project_name || '')" show-cancel-button :confirm-button-loading="savingRule" :before-close="saveRule">
      <van-field v-if="editTarget?.pay_type === 'work'" v-model="editMultiplier" label="工时倍率" type="number" input-align="right" />
      <van-field v-else v-model="editFixed" label="固定收入" type="number" input-align="right">
        <template #button><span class="unit">元</span></template>
      </van-field>
      <div class="edit-preview">{{ editPreview }}</div>
      <p v-if="ruleError" class="form-error edit-preview" role="alert">{{ ruleError }}</p>
    </van-dialog>
  </SettingsPageShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getBasePrice, getIncomeRules, updateBasePrice, updateIncomeRule } from '../services/rules'
import SettingsPageShell from '../components/SettingsPageShell.vue'
import MenuCard from '../components/MenuCard.vue'
import PageState from '../components/PageState.vue'
import { useFeedback } from '../composables/useFeedback'
import { formatMoney } from '../utils/format'

const loading = ref(true)
const loadError = ref('')
const savingBase = ref(false)
const savingRule = ref(false)
const baseRate = ref('')
const incomeRules = ref([])
const showEdit = ref(false)
const editTarget = ref(null)
const editMultiplier = ref('')
const editFixed = ref('')
const baseError = ref('')
const ruleError = ref('')
const feedback = useFeedback()

const projectRules = computed(() => incomeRules.value.filter(r => r.rule_type !== 'base'))
const editPreview = computed(() => {
  const rule = editTarget.value
  if (!rule) return ''
  if (rule.pay_type === 'fixed') return `每次收入 ${formatMoney(parseFloat(editFixed.value) || 0)}，不计工时`
  const multiplier = parseFloat(editMultiplier.value) || 0
  return `收入、计薪工时均按普通推拿 ×${multiplier}`
})

const loadRules = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const [bp, ir] = await Promise.all([getBasePrice(), getIncomeRules()])
    if (bp) baseRate.value = String(bp.base_rate)
    incomeRules.value = ir || []
  } catch (error) {
    loadError.value = error.message || '加载规则失败'
  } finally { loading.value = false }
}
onMounted(loadRules)

const ruleSummary = (rule) => {
  if (rule.pay_type === 'fixed') return `固定 ${formatMoney(rule.fixed_income)} / 次 · 不计工时`
  if (rule.project_id === 5 || rule.project_id === 6) {
    return `普通推拿30分钟收入（= 基准价 ×0.5，当前 ${formatMoney(rule.current_income)}）· 计薪 ${rule.current_work_hours}h`
  }
  return `收入、计薪工时均按普通推拿 ×${rule.work_multiplier}`
}

const saveBaseRate = async () => {
  if (savingBase.value) return
  baseError.value = ''
  const value = parseFloat(baseRate.value)
  if (!value || value <= 0) {
    baseError.value = '基准价必须大于 0'
    return
  }
  savingBase.value = true
  try {
    const bp = await updateBasePrice({ base_rate: value })
    if (bp) {
      baseRate.value = String(bp.base_rate)
      incomeRules.value = (await getIncomeRules()) || []
      feedback.success('基准价已更新')
    }
  } catch (e) { feedback.error(e.message || '更新失败') } finally { savingBase.value = false }
}

const editRule = (rule) => {
  if (!rule.editable) return
  ruleError.value = ''
  editTarget.value = rule
  editMultiplier.value = String(rule.work_multiplier || '')
  editFixed.value = String(rule.fixed_income ?? '')
  showEdit.value = true
}

const saveRule = async (action) => {
  if (action !== 'confirm') return true
  if (savingRule.value) return false
  ruleError.value = ''
  savingRule.value = true
  try {
    if (editTarget.value.pay_type === 'fixed') {
      const fixed = parseFloat(editFixed.value)
      if (!Number.isFinite(fixed) || fixed < 0) throw new Error('固定收入不能小于 0')
      await updateIncomeRule(editTarget.value.project_id, { fixed_income: fixed })
    } else {
      const multiplier = parseFloat(editMultiplier.value)
      if (!multiplier || multiplier <= 0) throw new Error('倍率必须大于 0')
      await updateIncomeRule(editTarget.value.project_id, { multiplier })
    }
    incomeRules.value = (await getIncomeRules()) || []
    feedback.success('规则已更新')
    return true
  } catch (e) { ruleError.value = e.message || '更新失败'; return false } finally { savingRule.value = false }
}
</script>

<style scoped>
.rule-base { padding: var(--space-2) var(--space-3) var(--space-4); }
.rule-base .van-field { padding-left: 4px; padding-right: 4px; margin-bottom: 8px; }
.rule-save { margin-top: var(--space-4); }
.unit { color: var(--c-text-3); }
.edit-preview { padding: var(--space-2) var(--space-4) var(--space-4); color: var(--c-text-3); font-size: var(--text-sm); }
</style>
