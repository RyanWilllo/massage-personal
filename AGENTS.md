# 工时和收入统计 · 个人版

本项目是独立的个人 iPhone PWA。先读 README 和 docs/architecture.md。

- 用户已确认：无账号、无登录，记录、计薪和统计均在本地完成。
- 数据仅存于当前网站来源的 IndexedDB，不自动同步。
- 无自动月结、月份锁定、文件导出、备份恢复或备份提醒。
- 旧团队项目位于 `/Users/xiaoluo/Downloads/massage`；本项目不得修改其线上数据或自动停止其服务。
- 旧团队系统在个人历史迁移、对账和 iPhone 验收完成后再下线。
- Vue 页面只负责交互；domain 模块负责计薪和汇总，storage 负责事务。
- 收入使用十进制 ROUND_HALF_UP 保留 1 位；小时保留 3 位，页面不得再次舍入工时。
- 按实际服务时间选择规则版本；历史项目时长、收入和计薪分钟保存快照。规则修改和时间编辑不得重算历史明细。
- 写操作在一个 IndexedDB 事务内完成；事务回调禁止异步操作。
- 禁止将个人记录、旧库、账号、绑定姓名、凭证或私密迁移数据放进 Git、网站资源或日志。
- 发布固定地址为 GitHub Pages 项目地址，构建 base 为 `/massage-personal/`；更换 origin 需要专门的数据迁移。
- 当前 GitHub 连接缺少 workflow 权限，源码位于 main，纯静态制品由 gh-pages 分支发布。工作流参考配置位于 tools，不自动执行。
- 依赖使用 npm 与 package-lock.json，构建使用 npm ci。变更同步权威文档、CHANGELOG 并提交 Git。
- 相关自动测试与构建必须执行。未经用户明确要求，不运行真实浏览器、点击流程或声称完成 iPhone 实机验收。
- 当前用户已明确授权公开个人版程序源码、创建独立仓库和 GitHub Pages 发布。后续外部发布须遵循当次用户授权。

- 2026-10-03 stage 2 explicitly authorized: freeze legacy business writes and enable temporary owner-only transfer; final iPhone import/readback requires user operation. See docs/migration.md. No old DB deletion or unrelated service changes.

- 2026-10-03 本人确认手机已保存测试记录，明确允许删除后迁入。仅在迁入页显示记录数并明确选择替换，在同一原子事务完成；预览后的写入、独立规则修改和已迁入标记继续受保护，禁止通用清库或自动覆盖。
