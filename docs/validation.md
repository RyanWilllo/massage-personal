# 本地验证

日期：2026-10-02（Asia/Shanghai）。

## 1.1.0 界面与录入调整

- `npm ci`：成功，沿用现有依赖及 package-lock.json，未新增依赖。
- `npm test`：38 项通过。新增 8 项使用 Vue 内存渲染器与 fake-indexeddb 的测试，覆盖同面板修改后多项目保存、上门互斥、失败重试、重复保存保护、取消与草稿重置、项目空状态重试、视口尺寸/位置变化及监听清理、无 Visual Viewport 时的回退。
- `PUBLIC_BASE=/massage-personal/ npm run build`：成功，Vue 模板编译通过。
- `npm run verify:build`：6 项通过，确认固定子路径、离线资源缓存、缓存隔离与手动更新机制。
- 键盘与视口为自动模拟，未运行真实浏览器、点击流程或 iPhone 实机验收；输入焦点、键盘遮挡及安全区仍需实机验证。
- 1.1.0 已发布并核对公网 37 个构建资源及 2 个发布标记，详见 [发布记录](releases/1.1.0.md)。未执行历史数据迁移或旧系统下线。

## 1.0.0 初始验证

- `npm ci` 安装成功，依赖审计未发现漏洞。安装脚本提醒已展开核对；esbuild 使用包内平台二进制，构建正常，无需额外批准安装脚本；fsevents 为可选平台依赖。
- `npm test`：30 项通过。含使用旧项目原始 Flask 计算模块、内存 SQLite 初始规则生成的 188 组合成样例；不读取个人数据库。
- `PUBLIC_BASE=/massage-personal/ npm run build`：成功。
- `npm run verify:build`：6 项通过，覆盖子路径 manifest/图标、所有懒加载资源离线缓存、离线导航、其他缓存隔离、安装失败保留旧版本、手动激活更新。
- 测试中的 IndexedDB 为 fake-indexeddb，Service Worker 为生命周期模拟。未执行真实浏览器和 iPhone 验收。
- 个人版记录初始为空；真实数据迁移和旧系统下线尚未执行。

公网发布成功后，使用 `node tools/verify-published.mjs <正式HTTPS地址>` 核对全部静态资源与本地构建哈希。发布实际证据追加在独立发布记录中。
