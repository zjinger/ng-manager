# ngm-hub 部署说明文档

本文档说明 **ngm-hub
服务的完整部署流程**，包括服务器初始化、远端脚本安装、发布流程、回滚及常见运维操作。

适用于当前项目结构：
```plaintext
    apps/hub/
    ├─ build/
    ├─ docs/
    ├─ scripts/
    │  ├─ build-all.js
    │  ├─ copy.js
    │  ├─ package-release.js
    │  ├─ deploy-server.js
    │  ├─ deploy-config.json
    │  └─ remote/
    │     ├─ server-init.sh
    │     ├─ remote-deploy.sh
    │     ├─ rollback.sh
    │     └─ clean-old-releases.sh
    ├─ server/
    ├─ web/
    └─ package.json
```
------------------------------------------------------------------------

# 1 部署架构说明

ngm-hub 采用 **release + current 软链接** 的部署模式。

优点：

-   支持快速回滚
-   支持多版本保留
-   发布过程稳定可靠

服务器目录结构：
```plaintext
/opt/ngm-hub
├── bin
│   ├── remote-deploy.sh
│   ├── rollback.sh
│   └── clean-old-releases.sh
├── current -> releases/xxxx
├── data
│   ├── hub.db
│   └── uploads
├── logs
├── incoming
│   └── ngm-hub.tar.gz
└── releases
    ├── 20260316_101500
    └── 20260318_220100
```

------------------------------------------------------------------------

# 2 服务器环境要求

服务器需要具备以下环境：

  软件      版本
  --------- ----------------
  Linux     任意主流发行版
  Node.js   ≥ 20
  npm       Node 自带
  pm2       用于进程管理
  tar       解压发布包

安装 pm2：

    npm install -g pm2

------------------------------------------------------------------------

# 3 SSH 免密登录

为了避免部署脚本执行时频繁输入密码，需要配置 **SSH Key 登录**。

验证方式：

    ssh root@SERVER_IP "echo ok"

如果直接返回：

    ok

说明免密登录配置成功。

------------------------------------------------------------------------

# 4 初始化服务器（仅执行一次）

服务器第一次部署前，需要执行 **server-init.sh**。

### 上传脚本

    scp server-init.sh root@SERVER_IP:/tmp/

### 执行初始化

    ssh root@SERVER_IP
    chmod +x /tmp/server-init.sh
    sudo /tmp/server-init.sh

初始化会完成：

-   创建 `/opt/ngm-hub` 目录
-   创建 `bin / releases / incoming / shared`
-   初始化 pm2
-   设置目录权限

------------------------------------------------------------------------

# 5 安装远端部署脚本

远端脚本只需要安装一次。

    npm run remote:install:prod

------------------------------------------------------------------------

# 6 构建项目

    npm run build

------------------------------------------------------------------------

# 7 打包发布包

    npm run package

生成：

    ngm-hub.tar.gz

------------------------------------------------------------------------

# 8 发布到服务器

    npm run release:prod

流程：

1 build\
2 package\
3 上传发布包\
4 执行远端部署

------------------------------------------------------------------------

# 9 跳过构建发布

    npm run release:prod:skip-build

------------------------------------------------------------------------

# 10 回滚版本

查看版本：

    ls /opt/ngm-hub/releases

回滚：

    /opt/ngm-hub/bin/rollback.sh <version>

------------------------------------------------------------------------

# 11 清理旧版本

    /opt/ngm-hub/bin/clean-old-releases.sh

------------------------------------------------------------------------

# 12 PM2 运维

查看状态

    pm2 status

查看日志

    pm2 logs

重启

    pm2 reload ecosystem.config.cjs

查看端口
    lsof -i:PORT

------------------------------------------------------------------------

# 13 推荐发布流程

    npm run release:prod

------------------------------------------------------------------------

# 14 发布流程图
```plaintext
Developer
   │
   │ npm run release:prod
   ▼
deploy-server.js
   │
   ├─ build
   │
   ├─ package
   │
   ├─ scp ngm-hub.tar.gz
   │
   └─ ssh remote-deploy.sh
            │
            ├─ create release
            ├─ extract archive
            ├─ npm ci
            ├─ switch current
            ├─ pm2 reload
            └─ clean old releases
```
------------------------------------------------------------------------

# 15 服务器最终结构（生产环境）
```plaintext
/opt/ngm-hub
├── bin
│   ├── remote-deploy.sh
│   ├── rollback.sh
│   └── clean-old-releases.sh
│
├── incoming
│   └── ngm-hub.tar.gz
│
├── releases
│   ├── 20260316_101200
│   ├── 20260316_103500
│   └── ...
│
├── shared
│   ├── logs
│   └── data
│
└── current -> releases/20260316_103500
```

------------------------------------------------------------------------

# 文档版本

  项目       内容
  ---------- ---------
  项目       ngm-hub
  更新时间   2026
