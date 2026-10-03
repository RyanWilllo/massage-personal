# 托管与验证

托管：GitHub Pages。仓库为独立 `massage-personal`，默认 main；项目构建 base 为 `/massage-personal/`。当前连接缺少 workflow 权限，使用本地 npm ci → 自动测试 → Vite 构建 → 离线制品验证，再将纯静态制品推送到 gh-pages 分支发布。GitHub 自身执行 Pages 部署；个人版源码不会启动自定义工作流。原自动构建配置保留为 tools/pages-workflow.reference.yml，未来授权相应权限后可另行启用。

网站只部署程序和初始公共计薪规则，不包含个人历史记录、数据库、凭证、测试产物或私密迁移数据。

离线 Service Worker 在 install 时完整缓存入口、全部路由动态模块、样式、图标和 manifest；安装失败删除新版本部分缓存，保留已工作的旧版本。更新准备完毕后由设置中的用户操作触发激活，避免编辑时自动重载。activate 仅清理本应用的旧程序缓存，不删 IndexedDB。

GitHub Pages 公网验证包括 HTTPS、首页和 manifest、图标、sw.js、所有构建资源、哈希和缓存路径核对。成功 URL 和实际发布状态见部署记录，不以预测地址代替发布成功。

自动测试使用 fake-indexeddb 验证业务事务和重开持久化，模拟 Service Worker 验证离线资源与更新生命周期。这不等于 Safari/iPhone 实机测试。尚需用户明确要求并完成：主屏幕安装、飞行模式录入、杀掉重开、键盘与安全区、真实设备存储和更新。


## 已发布入口

正式地址：https://ryanwilllo.github.io/massage-personal/ 。2026-10-03 的 1.1.1 SVG 图标修复已发布，37 个构建资源及 2 个发布标记均已公网核验通过，证据见 [1.1.1 发布记录](releases/1.1.1.md)。此前发布证据保留在 [1.1.0 发布记录](releases/1.1.0.md) 和 [1.0.0 发布记录](releases/1.0.0.md)。

更新时先完成本地提交、npm ci、业务测试、固定 base 构建与离线制品验证。推送 main 源码后，将 dist（加 .nojekyll 及来源提交 release.json）在独立临时 checkout 中提交到 gh-pages，保持静态分支历史并正常快进推送，禁止强推。随后等待 Pages 构建成功，并用 tools/verify-published.mjs 核对全部资源。GitHub CLI 使用逐命令 HTTPS 认证，未修改全局凭据或旧团队仓库传输设置。
