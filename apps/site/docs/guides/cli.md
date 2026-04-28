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
ngm logs
```

## 命令说明

- `ngm ui`：启动本地服务，并尝试自动打开 UI。
- `ngm server`：只启动服务，不负责界面入口。
- `ngm status`：查看当前服务状态。
- `ngm stop`：停止正在运行的服务。
- `ngm restart`：重启服务但不打开 UI。
- `ngm ui:restart`：重启服务并重新打开 UI。
- `ngm logs`：查看服务日志。

## 常用参数

```bash
ngm ui --port 4100 --host 127.0.0.1 --data-dir ./data --log-level info
```

- `--port`：指定服务端口。
- `--host`：指定监听地址，默认 `127.0.0.1`。
- `--data-dir`：指定数据目录。
- `--log-level`：指定日志级别。
- `--foreground`：前台运行模式，日志输出到终端，进程跟随终端生命周期。
- `--no-open`：仅启动，不自动打开浏览器。

## 运行模式

### 后台模式（默认）

```bash
ngm ui
```

- 服务在后台运行，CLI 退出后服务继续运行
- 日志写入 `<dataDir>/logs/server.out.log` 和 `server.err.log`
- 关闭终端不会影响服务运行

### 前台模式

```bash
ngm ui --foreground
```

- 服务在前台运行，日志直接输出到终端
- 关闭终端会同时停止服务
- 适合调试或临时运行场景

## 日志查看

```bash
# 查看最近 100 行 stdout 日志
ngm logs

# 查看 stderr 日志
ngm logs --err

# 查看最后 200 行
ngm logs --lines 200

# 实时跟踪日志
ngm logs --follow
```

## 日志文件

日志文件位于 `<dataDir>/logs/` 目录下：

- `server.out.log`：标准输出日志
- `server.err.log`：错误输出日志

每次启动服务时，旧日志会自动备份为带时间戳的文件，例如：
`server.out.log.2026-04-28T10-30-00.backup`

## 安全说明

- 服务默认绑定 `127.0.0.1`，仅允许本地访问
- `/shutdown` 端点需要 token 校验，仅允许 localhost 调用
- 如需局域网访问，请使用 `--host 0.0.0.0`，但请注意安全风险
