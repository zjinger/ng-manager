# 下载

本页用于集中说明 `ng-manager` 的获取方式。当前项目适合分为桌面端、CLI 和源码接入三种模式。

## 桌面端

- 适合希望开箱即用的本地开发者。
- 通常通过内部发布页、共享目录或制品库分发安装包。
- 安装后可直接启动，无需手动拼装服务与 Web UI。

## CLI

如果你已经把 CLI 发布到 npm 或私有源，可以直接安装：

```bash
npm i -g @yinuo-ngm/cli
```

安装完成后使用 `ngm ui` 启动。

## 源码方式

适合参与开发或需要本地调试整个工作区的场景。

```bash
# Web UI
cd webapp
npm start

# Electron Desktop
cd desktop
npm run electron:serve
```

## 发布建议

- 桌面端优先提供固定版本安装包，便于团队回滚。
- CLI 优先发布到内部 npm 源，便于统一升级。
- 文档站建议与版本发布同步更新，避免命令和安装方式过期。
