# Getting Started

本页目标：**5 分钟跑起来**（安装 → 启动 → 导入项目 → 运行第一个任务）。

## 1. 安装

- Desktop：从下载页获取桌面安装包。
- CLI：如果你已将 CLI 发布到 npm 或私有源，可执行：

```bash
npm i -g @yinuo-ngm/cli
```


## 2. 启动

- Desktop：双击启动桌面应用。
- CLI：直接拉起本地服务并打开 UI。

```bash
ngm ui
```

启动成功后，浏览器会打开 UI（或桌面端内嵌）。

## 3. 导入一个项目

- 选择项目根目录
- ng-manager 会扫描：
  - `package.json` 中的 scripts
  - 框架特征（Angular / Vue / Node 等）
  - 可运行任务（`dev` / `build` / `test` / `lint`）

## 4. 运行第一个任务

- 在任务页执行 `npm run dev`（或识别到的等价脚本）
- 观察：
  - 日志流
  - 退出码
  - 耗时

如果项目已经配置了多个脚本，建议先运行最轻量的开发任务，确认环境变量、端口与 Node 版本都正确。

## 5. 常见问题

### Node 版本不兼容
如果导入旧 Angular 项目，Node 过高可能导致 `npm start` 报错。
建议用 nvm（或 ng-manager 的 Node 版本提示/切换能力）对齐项目要求。

### CLI 启动后没有自动打开页面

可以使用以下命令仅启动服务，不自动打开浏览器：

```bash
ngm server --no-open
```

默认地址通常为 `http://127.0.0.1:<port>`，可通过 `--port` 覆盖端口。
