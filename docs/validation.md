# 1.0.0 本地验证

日期：2026-10-02（Asia/Shanghai）。

- `npm ci` 安装成功，依赖审计未发现漏洞。安装脚本提醒已展开核对；esbuild 使用包内平台二进制，构建正常，无需额外批准安装脚本；fsevents 为可选平台依赖。
- `npm test`：30 项通过。含使用旧项目原始 Flask 计算模块、内存 SQLite 初始规则生成的 188 组合成样例；不读取个人数据库。
- `PUBLIC_BASE=/massage-personal/ npm run build`：成功。
- `npm run verify:build`：6 项通过，覆盖子路径 manifest/图标、所有懒加载资源离线缓存、离线导航、其他缓存隔离、安装失败保留旧版本、手动激活更新。
- 测试中的 IndexedDB 为 fake-indexeddb，Service Worker 为生命周期模拟。未执行真实浏览器和 iPhone 验收。
- 个人版记录初始为空；真实数据迁移和旧系统下线尚未执行。

公网发布成功后，使用 `node tools/verify-published.mjs <正式HTTPS地址>` 核对全部静态资源与本地构建哈希。发布实际证据追加在独立发布记录中。
