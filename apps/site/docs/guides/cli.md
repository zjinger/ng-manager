# CLI

`@yinuo-ngm/cli` 提供了一个统一入口命令：`ngm`。

## 安装

```bash
npm i -g @yinuo-ngm/cli
```

## 常用命令

```bash
ngm ui
ngm server
ngm status
ngm stop
ngm restart
ngm ui:restart
```

## 命令说明

- `ngm ui`：启动本地服务，并尝试自动打开 UI。
- `ngm server`：只启动服务，不负责界面入口。
- `ngm status`：查看当前服务状态。
- `ngm stop`：停止正在运行的服务。
- `ngm restart`：重启服务但不打开 UI。
- `ngm ui:restart`：重启服务并重新打开 UI。

## 常用参数

```bash
ngm ui --port 4100 --host 127.0.0.1 --data-dir ./data --log-level info
```

- `--port`：指定服务端口。
- `--host`：指定监听地址，默认 `127.0.0.1`。
- `--data-dir`：指定数据目录。
- `--log-level`：指定日志级别。
- `--no-open`：仅启动，不自动打开浏览器。
