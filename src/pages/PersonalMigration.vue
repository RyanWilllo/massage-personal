<template>
  <SettingsPageShell title="迁入旧记录" back-to="/settings" :aria-busy="busy">
    <section class="card migration-note">
      <p>请在 iPhone 主屏幕打开个人版后操作。迁入只执行一次，保留本人历史计薪快照和规则。</p>
      <p>在 Safari 登录旧系统的本人管理员账号，打开「管理员后台 → 迁入个人版」，复制迁移码后回到这里粘贴。</p>
      <p>迁移码 15 分钟有效。记录会直接写入当前设备；不会下载文件，也不会发布到 GitHub。</p>
    </section>
    <PageState v-if="loading" type="loading" message="检查本地迁入状态…" />
    <template v-else-if="receipt">
      <p class="migration-note" role="status">{{ receipt.status === 'verified' ? '迁入完成，重新打开数据库核对通过。可以开始使用个人版。' : '记录已保存，仍需完成重新读取核对；核对前已暂停个人版录入。' }}</p>
      <van-button v-if="receipt.status !== 'verified'" type="primary" block :loading="busy" @click="verify">完成保存核对</van-button>
      <MigrationSummary :months="receipt.months" />
    </template>
    <template v-else>
      <van-field v-model.trim="token" label="迁移码" type="textarea" autocomplete="off" :disabled="busy || !!prepared" placeholder="粘贴旧系统的本人迁移码" />
      <van-button v-if="!prepared" type="primary" block :loading="busy" @click="receive">读取并核对旧记录</van-button>
      <template v-else>
        <p class="migration-note" role="status">逐月金额、计薪分钟、记录数和明细核对通过。确认下方数据属于你，再保存到手机。</p>
        <MigrationSummary :months="prepared.months" />
        <van-button type="primary" block :loading="busy" @click="save">确认是本人记录，保存到手机</van-button>
      </template>
    </template>
    <p v-if="error" class="migration-note" role="alert">{{ error }}</p>
  </SettingsPageShell>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SettingsPageShell from '../components/SettingsPageShell.vue'
import PageState from '../components/PageState.vue'
import MigrationSummary from '../components/MigrationSummary.vue'
import { readState } from '../storage/database.js'
import { receiveMigration, importMigration, verifySavedMigration } from '../services/migration.js'
const token = ref(''), prepared = ref(null), receipt = ref(null), busy = ref(false), loading = ref(true), error = ref('')
let disposed = false
async function run(action) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await action() } catch (e) { if (!disposed) error.value = e.message || '迁入失败，请检查网络后重试' }
  finally { busy.value = false }
}
const receive = () => run(async () => { const preview = await receiveMigration(token.value); token.value = ''; if (!disposed) prepared.value = preview })
const save = () => run(async () => {
  try { const result = await importMigration(prepared.value); if (!disposed) { receipt.value = result; prepared.value = null } }
  catch (e) { const state = await readState(); if (!disposed) receipt.value = state.migration ?? null; throw e }
})
const verify = () => run(async () => { const result = await verifySavedMigration(); if (!disposed) receipt.value = result })
onMounted(async () => { try { receipt.value = (await readState()).migration ?? null } catch (e) { error.value = e.message } finally { loading.value = false } })
onBeforeUnmount(() => { disposed = true; token.value = ''; prepared.value = null })
</script>
<style scoped>
.migration-note { margin: var(--space-4) 0; padding: var(--space-4); color: var(--c-text-2); font-size: var(--text-sm); line-height: 1.65; }
.migration-note p + p { margin-top: var(--space-3); }
</style>
