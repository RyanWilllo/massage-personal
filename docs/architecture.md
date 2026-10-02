# 架构

GitHub Pages 仅提供 HTML、JS、CSS 和图标；Service Worker 缓存应用资源。运行时没有业务 HTTP API、服务端账号、数据库或定时任务。

Vue 页面 → services 本地操作 → domain 计薪/验证 → storage IndexedDB。

domain 使用 decimal.js 实现十进制计算和 ROUND_HALF_UP。页面读取业务模块生成的收入及小时展示值，禁止页面再次舍入工时。规则与服务明细保存历史快照。

IndexedDB 版本 1 使用 `state` store 的 `personal` 单记录保存完整业务状态，在个人小规模记录场景中以一个同步回调执行全量原子更新。不同窗口的写事务由 IndexedDB 串行化，避免两个窗口覆盖对方。未来增长需要升级时，以版本事务拆分 store，不清空现有数据。

无账号、月结锁定、导出/恢复或远端个人记录。只允许程序资源进入离线缓存。应用升级不修改 IndexedDB，数据库升级失败时保留旧数据。

固定 origin 和路径保持稳定。不同设备/浏览器/网址不共享记录。
