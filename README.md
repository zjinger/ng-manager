## 开发启动

1. webapp：npm start
2. desktop：npm run electron:serve

## CI/CD

- `CI`：在 `push`（`main`/`master`）和 `pull_request` 时执行 `npm ci`、`npm run build`、`npm run pack:all`，并覆盖 Node.js 18/20。
- `Release`：支持两种触发方式：
  - 推送 `v*` 标签时自动发布到 npm（需配置仓库密钥 `NPM_TOKEN`）。
  - 手动触发 `workflow_dispatch`：可选择 `dry_run=true` 仅做构建与打包校验，不发布。
