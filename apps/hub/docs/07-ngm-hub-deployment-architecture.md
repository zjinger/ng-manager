# ngm-hub 部署架构设计

最后更新：2026-03-06

## 概述

本文档描述 **ngm-hub 在内网环境中的推荐部署架构**。

ngm-hub 设计目标：

- 部署简单
- 运维成本低
- 适合内网环境
- 不依赖云服务

---

# 部署组件

ngm-hub 由两个部分组成：

```
ngm-hub
├─ hub-server (Fastify)
└─ hub-web (Angular)
```

通常 hub-web 会构建为静态资源，并由 hub-server 提供。

---

# 推荐部署拓扑

```
                +-----------------------+
                |    开发者客户端      |
                |  ngm-cli / desktop   |
                +-----------+-----------+
                            |
                            | HTTP / WS
                            |
                    +-------v--------+
                    |     Nginx      |
                    |  反向代理层    |
                    +-------+--------+
                            |
                            |
                    +-------v--------+
                    |    ngm-hub     |
                    |  Fastify App   |
                    +-------+--------+
                            |
                    +-------v--------+
                    |    SQLite DB   |
                    +----------------+
```

---

# 推荐端口

| 服务 | 端口 |
|---|---|
| ngm-hub | 8080 |
| Nginx | 80 / 443 |

---

# Nginx 示例配置

```
server {
  listen 80;
  server_name hub.internal;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

---

# Docker 部署（可选）

Dockerfile 示例：

```
FROM node:20

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

CMD ["node","dist/app.js"]
```

运行：

```
docker run -p 8080:8080 ngm-hub
```

---

# 数据目录

推荐挂载数据卷：

```
/data/ngm-hub
├─ hub.db
├─ docs
└─ uploads
```

---

# 备份策略

建议每日备份：

- hub.db
- docs/
- uploads/

备份方式：

```
tar -czf hub-backup.tar.gz data/hub
```

---

# 总结

ngm-hub 的部署设计目标是：

**简单、稳定、易维护。**
