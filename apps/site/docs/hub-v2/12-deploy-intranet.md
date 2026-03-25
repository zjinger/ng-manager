# Hub-v2 内网部署与迁移执行（192.168.1.31）

最后更新：2026-03-26

## 1. 目标

在 `192.168.1.31` 以和 hub v1 一致的发布方式部署 `hub-v2`，并补上 v1 -> v2 数据迁移。

本方案默认：

- v2 独立目录：`/opt/ngm-hub-v2`
- v2 独立端口：`7008`
- 验证通过后再切流（Nginx/入口切换）

---

## 2. 一次性初始化（本地执行）

在 `d:/ng-manager/apps/hub-v2` 下执行：

```bash
npm install
npm run remote:install:prod
ssh root@192.168.1.31 "/opt/ngm-hub-v2/bin/server-init.sh"
```

说明：

- `remote:install:prod` 会把远端脚本安装到 `/opt/ngm-hub-v2/bin`
- `server-init.sh` 会创建目录并准备 pm2，首次部署建议执行

---

## 3. 发布 v2（本地执行）

```bash
npm run release:prod
```

如果你已在本地完成构建，可使用：

```bash
npm run release:prod:skip-build
```

发布过程会自动：

1. 构建 web + server
2. 组装发布包 `ngm-hub-v2.tar.gz`
3. 上传到 `192.168.1.31:/opt/ngm-hub-v2/incoming`
4. 远端解压发布
5. 执行 `db:migrate`
6. `pm2 reload/start` `ngm-hub-v2`

---

## 4. 迁移 v1 数据到 v2（服务器执行）

登录服务器后在当前发布目录执行：

```bash
cd /opt/ngm-hub-v2/current
npm run db:migrate:from-v1 -- --source "/opt/ngm-hub/data/hub.db"
npm run db:verify:from-v1 -- --source "/opt/ngm-hub/data/hub.db"
pm2 reload ecosystem.config.cjs
```

如果你的 v1 数据库路径不是 `/opt/ngm-hub/data/hub.db`，替换为真实路径。

---

## 5. 切流建议

先保持 v1 在线，先通过 v2 端口验收：

- `http://192.168.1.31:7008`（或你的反向代理地址）

验收通过后再把入口切到 v2。

---

## 6. 回滚

服务器执行：

```bash
/opt/ngm-hub-v2/bin/rollback.sh <release-folder-name>
```

如需回到 v1，只需把入口路由切回 v1。

---

## 7. 常见故障

### 7.1 `/usr/bin/env: ‘bash\r’: No such file or directory`

原因：远端 shell 脚本是 `CRLF` 行尾。

处理：

```bash
ssh root@192.168.1.31 "sed -i 's/\r$//' /opt/ngm-hub-v2/bin/*.sh && chmod +x /opt/ngm-hub-v2/bin/*.sh"
```

然后重新执行：

```bash
npm run remote:install:prod
npm run release:prod:skip-build
```

### 7.2 发布后服务未起来

在服务器检查：

```bash
pm2 status
pm2 logs ngm-hub-v2 --lines 200
```

并确认：

- `/opt/ngm-hub-v2/current/.env.production` 存在且配置正确
- `/opt/ngm-hub-v2/current/index.js` 存在
- `/opt/ngm-hub-v2/current/db/migrate-cli.js` 存在
- `current` 软链已切到最新 release
