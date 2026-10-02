# 工时和收入统计 · 个人版

个人 iPhone PWA，使用 GitHub Pages 提供固定 HTTPS 地址。无需自有域名、账号、业务服务器或云数据库。

支持一次性服务录入、多项目选择、点钟、备注与时间编辑、删除服务/明细、日月统计、日历、规则版本及项目启停。数据仅保存在当前设备的 IndexedDB。首次联网完成离线准备后，可断网使用所有页面。

不提供月结锁定、PDF/CSV、其他文件导出、备份恢复、账号或同事管理。清除网站数据或丢失设备后，本地记录无法恢复。

## 开发与验证

使用 Node.js 24 和 npm。

```sh
npm ci
npm test
PUBLIC_BASE=/massage-personal/ npm run build
npm run verify:build
```

本地开发：`npm run dev`，默认端口 5174，不需要 Flask 或 SQLite 服务。

GitHub Pages 地址以成功的部署记录为准，发布说明见 [托管](docs/hosting.md)。

## 文档

- [架构](docs/architecture.md)
- [计薪与服务规则](docs/business-rules.md)
- [本地数据](docs/local-data.md)
- [历史迁移](docs/migration.md)
- [托管与验证](docs/hosting.md)
- [本地验证结果](docs/validation.md)

原团队项目作为参考保留，当前发布不代表历史数据已迁入，也不代表旧系统已下线。
