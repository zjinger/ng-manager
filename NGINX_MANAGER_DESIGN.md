# Nginx 可视化管理功能设计

## 需求背景

ng-manager 目前需要开发者手动通过命令行管理本地 Nginx 服务，操作繁琐。希望在 ng-manager 中集成本地 Nginx 的可视化管理能力，提升本地开发效率。

## 核心需求

1. **绑定本地 Nginx**：支持指定本机 Nginx 可执行文件路径，完成实例绑定
2. **服务控制**：支持对 Nginx 进行启动、停止、重载等基础操作
3. **配置编辑**：支持在 ng-manager 中直接查看和编辑 Nginx 配置文件
4. **Server 管理**：支持查看现有 server 列表，并能新增、编辑、启用/禁用 server 块

## 技术约定

- **本地命令执行**：通过 Node.js 本地服务调用系统命令
- **配置编辑器**：使用 NzCodeEditorModule（ng-zorro）
- **文件读写权限**：默认直接读写；无权限时提权处理（如 sudo / 管理员权限提示）

## 架构设计

### 1. 后端设计 (packages/server)

```
packages/server/src/routes/nginx/
├── nginx.routes.ts          # 路由定义
├── nginx.service.ts         # Nginx 服务管理
├── nginx-config.service.ts  # 配置文件管理
├── nginx-server.service.ts  # Server 块管理
└── nginx.types.ts           # 类型定义
```

**API 设计：**

```typescript
// Nginx 实例管理
GET    /nginx/status              # 获取 Nginx 状态
POST   /nginx/bind                 # 绑定 Nginx 路径
POST   /nginx/start                # 启动 Nginx
POST   /nginx/stop                 # 停止 Nginx
POST   /nginx/reload               # 重载配置
POST   /nginx/test                 # 测试配置

// 配置管理
GET    /nginx/config               # 读取主配置
PUT    /nginx/config               # 更新主配置
GET    /nginx/config/validate      # 验证配置语法

// Server 管理
GET    /nginx/servers              # 获取所有 server 块
GET    /nginx/servers/:id          # 获取单个 server
POST   /nginx/servers              # 新增 server
PUT    /nginx/servers/:id          # 更新 server
DELETE /nginx/servers/:id          # 删除 server
PATCH  /nginx/servers/:id/enable   # 启用 server
PATCH  /nginx/servers/:id/disable  # 禁用 server
```

### 2. 前端设计 (webapp)

```
webapp/src/app/pages/nginx/
├── nginx.component.ts             # 主页面
├── nginx.routes.ts                # 路由
├── nginx.module.ts                # 模块
├── components/
│   ├── nginx-status/              # 状态面板
│   ├── nginx-control/             # 控制面板
│   ├── nginx-config-editor/       # 配置编辑器
│   ├── nginx-server-list/         # Server 列表
│   └── nginx-server-form/         # Server 表单
├── services/
│   ├── nginx.service.ts           # Nginx API 服务
│   └── nginx-config-parser.ts     # 配置解析器
└── models/
    └── nginx.types.ts             # 类型定义
```

### 3. 数据模型

```typescript
// Nginx 实例
interface NginxInstance {
  path: string;                    // nginx 可执行文件路径
  version: string;                 // 版本号
  configPath: string;              // 主配置文件路径
  prefixPath: string;              // 安装前缀路径
  isBound: boolean;                // 是否已绑定
  isRunning: boolean;              // 是否运行中
  pid?: number;                    // 进程 ID
}

// Nginx 状态
interface NginxStatus {
  isRunning: boolean;
  pid?: number;
  uptime?: string;
  workerProcesses?: number;
  activeConnections?: number;
}

// Server 块
interface NginxServer {
  id: string;
  name: string;                    // server_name
  listen: string[];                // 监听端口
  locations: NginxLocation[];      // location 块
  ssl: boolean;                    // 是否启用 SSL
  enabled: boolean;                // 是否启用
  configText: string;              // 原始配置文本
  filePath?: string;               // 配置文件路径
}

// Location 块
interface NginxLocation {
  path: string;                    // location 路径
  proxyPass?: string;              // 代理目标
  root?: string;                   // 根目录
  index?: string[];                // 默认文件
  tryFiles?: string[];             // try_files 配置
}
```

## 实现步骤

### Phase 1: 后端基础
1. 创建 Nginx 服务类，支持命令执行
2. 实现 Nginx 实例绑定和状态检测
3. 实现启动/停止/重载等基础操作

### Phase 2: 配置管理
1. 实现配置文件读写
2. 实现配置语法验证
3. 实现 Server 块解析和生成

### Phase 3: 前端界面
1. 创建 Nginx 主页面
2. 实现状态面板和控制按钮
3. 集成 Monaco Editor 配置编辑器
4. 实现 Server 列表和管理

### Phase 4: 优化完善
1. 权限处理（sudo / 管理员权限）
2. 错误处理和提示
3. 配置自动备份
4. 配置语法高亮

## 技术细节

### Nginx 命令执行

```typescript
// 获取 Nginx 版本
nginx -v

// 测试配置
nginx -t

// 启动 Nginx
nginx

// 停止 Nginx
nginx -s stop

// 重载配置
nginx -s reload

// 指定配置文件启动
nginx -c /path/to/nginx.conf

// 指定前缀路径
nginx -p /path/to/prefix
```

### 配置文件解析

Nginx 配置文件结构：
```nginx
# 全局块
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 可以包含其他配置文件
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

Server 块解析策略：
- 使用正则表达式匹配 `server { ... }` 块
- 提取 `listen`、`server_name`、`location` 等指令
- 支持注释和条件编译（`#` 开头的行）

### 权限处理

Windows:
- 以管理员身份运行 Node.js 进程
- 使用 PowerShell 提权提示

macOS/Linux:
- 使用 `sudo` 执行 Nginx 命令
- 配置文件可能需要 `sudo` 权限

## 界面设计

### 主页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  Nginx 管理                                      [设置路径] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │ 状态面板        │  │ 控制面板                         │  │
│  │                 │  │  [启动] [停止] [重载] [测试配置] │  │
│  │ 运行状态: ● 运行│  │                                  │  │
│  │ 版本: 1.24.0    │  │  配置路径: /etc/nginx/nginx.conf │  │
│  │ PID: 1234       │  │  前缀路径: /usr/local/nginx      │  │
│  │ 运行时间: 2天   │  │                                  │  │
│  └─────────────────┘  └──────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  [配置编辑器] [Server 管理]                                   │
├─────────────────────────────────────────────────────────────┤
│  配置编辑器 / Server 列表内容                                 │
└─────────────────────────────────────────────────────────────┘
```

### Server 列表

```
┌─────────────────────────────────────────────────────────────┐
│ Server 列表                                       [新增]    │
├─────────────────────────────────────────────────────────────┤
│  状态  │  名称          │  监听        │  操作              │
├────────┼────────────────┼──────────────┼────────────────────┤
│  ●     │  example.com   │  80, 443     │  [编辑] [禁用] [×] │
│  ●     │  api.local     │  8080        │  [编辑] [禁用] [×] │
│  ○     │  test.dev      │  3000        │  [编辑] [启用] [×] │
└─────────────────────────────────────────────────────────────┘
```

## 风险与注意事项

1. **配置错误可能导致 Nginx 无法启动**
   - 在保存配置前进行语法验证
   - 提供配置回滚功能
   - 备份原始配置文件

2. **权限问题**
   - 配置文件通常需要 root 权限
   - 提供清晰的权限提示
   - 支持 sudo 密码输入

3. **多平台兼容性**
   - Windows: nginx.exe 路径和配置文件路径不同
   - macOS: 可能使用 Homebrew 安装的 Nginx
   - Linux: 可能使用系统包管理器安装的 Nginx

4. **配置文件格式差异**
   - 不同版本的 Nginx 配置语法可能有差异
   - 不同平台的默认配置路径不同
   - 支持 include 指令的递归解析
