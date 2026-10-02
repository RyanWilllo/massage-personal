<template>
  <SettingsPageShell title="应用设置">
    <PageState v-if="loading" type="loading" message="读取应用信息…" />
    <PageState v-else-if="error" type="error" :message="error" action-text="重试" @action="load" />
    <template v-else>
      <MenuCard>
        <van-cell title="版本" :value="info.version" />
        <van-cell title="已保存记录" :value="`${info.record_count} 条`" />
        <van-cell title="最早记录" :value="info.first_date" />
        <van-cell title="保存位置" value="当前设备" />
        <van-cell title="离线使用" :value="offlineReady ? '已就绪' : '首次联网准备中'" />
      </MenuCard>
      <section class="card settings-note">
        <h2>添加到主屏幕</h2>
        <p>在 Safari 分享菜单中选择「添加到主屏幕」，即可像应用一样打开。</p>
      </section>
      <van-button type="primary" block :loading="checking" :disabled="checking" @click="checkUpdate">检查应用更新</van-button>
      <p v-if="updateMessage" class="settings-note" role="status">{{ updateMessage }}</p>
      <van-button v-if="updateReady" type="primary" plain block @click="applyUpdate">重新打开以更新</van-button>
    </template>
  </SettingsPageShell>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getSystemInfo } from '../services/rules'
import SettingsPageShell from '../components/SettingsPageShell.vue'
import MenuCard from '../components/MenuCard.vue'
import PageState from '../components/PageState.vue'
import { checkForUpdate, applyUpdate, getPwaState } from '../pwa/register.js'
const info = ref({}), loading = ref(true), error = ref(''), checking = ref(false)
const offlineReady = ref(false), updateReady = ref(false), updateMessage = ref('')
const syncPwa = () => { const state = getPwaState(); offlineReady.value = state.offlineReady; updateReady.value = state.updateReady }
async function load() {
  loading.value = true; error.value = ''
  try { info.value = await getSystemInfo() } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
async function checkUpdate() {
  checking.value = true
  try {
    await checkForUpdate(); syncPwa()
    updateMessage.value = updateReady.value ? '新版本已准备好，保存中的操作完成后可以更新。' : '已检查更新；如有新版本，准备完成后会显示更新按钮。'
  } catch { updateMessage.value = '当前无法检查更新，已有记录和离线使用不受影响。' }
  finally { checking.value = false }
}
onMounted(() => { load(); syncPwa(); window.addEventListener('pwa-state', syncPwa) })
onBeforeUnmount(() => window.removeEventListener('pwa-state', syncPwa))
</script>
<style scoped>
.settings-note { margin: var(--space-4) 0; padding: var(--space-4); color: var(--c-text-2); font-size: var(--text-sm); line-height: 1.6; }
.settings-note h2 { font-size: var(--text-md); color: var(--c-text); margin-bottom: var(--space-2); }
</style>
