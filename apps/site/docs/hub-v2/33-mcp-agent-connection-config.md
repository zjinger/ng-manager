# 33 MCP 与 Agent Connection 配置收口方案

最后更新：2026-06-07

本文档记录 ng-manager 统一 MCP Server 与 Hub V2 Token 配置的最终落地口径。目标是让 AI Agent 通过 `ngm mcp` 使用 Hub V2 能力，同时让 MCP Server 可以独立读取本地 Agent Connection 配置，不依赖 `packages/server`、SQLite 或 Hub V2 管理端登录态。

## 1. 结论

当前落地结论如下：

- ng-manager 只保留一个 MCP Server：`packages/mcp-server`
- 用户启动入口统一为：`ngm mcp`
- MCP transport 当前只支持 stdio
- NGM 本地能力通过只读 MCP tools 暴露 workspace、project、runtime、Nginx 等诊断入口
- Hub V2 MCP tools 通过 Hub V2 Token HTTP API 调用真实业务服务
- Hub V2 Token 持久配置只读取：`~/.ng-manager/agent-connections.json`
- 启动级 override 只保留少量 `HUB_V2_*` 环境变量
- 不再扫描 legacy 配置文件、OpenCode 配置、Claude settings 或旧环境变量前缀
- MCP tool 参数不接受 token

## 2. 架构边界

```text
AI Agent / MCP Client
  -> ngm mcp
  -> packages/mcp-server
  -> HubV2Client
  -> Hub V2 Token HTTP API
  -> Hub V2 Server
```

NGM 本地只读能力链路：

```text
AI Agent / MCP Client
  -> ngm mcp
  -> packages/mcp-server
  -> ToolContext.services
  -> packages/core
  -> packages/project / packages/task / packages/node-runtime / packages/node-version / packages/nginx
```

职责边界：

| 层级 | 职责 |
| --- | --- |
| Skill | Agent 使用说明、调用策略、确认流程和回复规范，不执行真实操作 |
| MCP Server | 工具注册、参数校验、policy 检查、错误转换、输出大小限制 |
| HubV2Client | Hub V2 Token HTTP API 封装、鉴权 header、HTTP 错误结构化 |
| Hub V2 Server | 真实业务服务、scope 校验、业务权限校验、审计落库 |
| packages/cli | 用户启动入口，提供 `ngm mcp` |

ng-manager 本地能力应优先走 `packages/core`。Hub V2 MCP tools 允许调用 Hub V2 Token HTTP API，因为这是 Hub V2 对 AI Agent 暴露的集成契约。

MCP Server 不允许提供任意 shell 执行、系统环境变更、远程执行客户端命令、任意文件读写或绕过 Hub V2 权限模型的能力。

## 3. 配置读取策略

配置优先级：

```text
tool args project/projectKey
HUB_V2_* environment variables
HUB_V2_CONFIG explicit config path
~/.ng-manager/agent-connections.json
```

说明：

- `project` 用于选择 `agent-connections.json` 中的项目 alias
- `projectKey` 用于覆盖最终请求中的 Hub V2 project key
- `projectKey` 只覆盖 project key，不会丢弃已选项目的 `baseUrl`、`projectToken` 或 `personalToken`
- `HUB_V2_CONFIG` 用于测试、临时调试或 MCP client 注入自定义配置文件
- 默认持久配置文件固定为 `~/.ng-manager/agent-connections.json`

## 4. 支持的环境变量

当前只支持以下环境变量：

```text
NGM_DATA_DIR
NGM_WORKSPACE_ROOT
NGM_MCP_UPLOAD_ROOT
NGM_MCP_MAX_UPLOAD_BYTES
NGM_MCP_MAX_RESULT_CHARS
NGM_MCP_ALLOW_WRITE
NGM_MCP_ALLOW_EXECUTE
NGM_MCP_ALLOW_DANGEROUS
HUB_V2_PROJECT
HUB_V2_BASE_URL
HUB_V2_PROJECT_KEY
HUB_V2_PROJECT_TOKEN
HUB_V2_PERSONAL_TOKEN
HUB_V2_SOURCE
HUB_V2_CONFIG
```

示例：

```bash
NGM_DATA_DIR=C:/Users/you/.ng-manager
NGM_WORKSPACE_ROOT=D:/ng-manager
HUB_V2_BASE_URL=http://127.0.0.1:7001
HUB_V2_PROJECT_KEY=ng-manager
HUB_V2_PROJECT_TOKEN=project-token-for-reads
HUB_V2_PERSONAL_TOKEN=personal-token-for-writes
HUB_V2_SOURCE=agent
```

写工具 policy：

```bash
NGM_MCP_ALLOW_WRITE=true
```

执行和高危工具 policy：

```bash
NGM_MCP_ALLOW_EXECUTE=true
NGM_MCP_ALLOW_DANGEROUS=true
```

当前 MCP Server 默认允许 read 工具。write、execute、dangerous 默认阻断。部分 NGM 本地工具已经提供受控写入/执行能力，但默认只返回 preview；只有 `confirm=true` 且对应 policy 环境变量放行时才执行真实操作。即使启用 execute，也不会获得任意 shell、任意 PID kill、任意文件写入或系统级 Node/Nginx 修改能力。

这些变量只控制 MCP Server policy 是否放行对应 risk level，不提供 Hub V2 业务权限。真实写操作仍必须同时满足：

- tool call 传入 `confirm=true`
- 已配置 `HUB_V2_PERSONAL_TOKEN` 或 `agent-connections.json` 中的 `personalToken`
- Personal Token 拥有对应 Hub V2 scope，例如 `issue:create:write`、`issue:update:write`、`issue:comment:write`、`rd:create:write`、`rd:transition:write`

其他 NGM MCP 环境变量：

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `NGM_DATA_DIR` | `~/.ng-manager` | ng-manager 本地数据目录 |
| `NGM_WORKSPACE_ROOT` | `process.cwd()` | MCP Server 的本地 workspace hint，也用于限制部分文件读取/上传根目录 |
| `NGM_MCP_UPLOAD_ROOT` | 未设置 | Hub V2 Markdown 图片上传额外允许根目录 |
| `NGM_MCP_MAX_UPLOAD_BYTES` | `5242880` | Markdown 图片上传最大字节数 |
| `NGM_MCP_MAX_RESULT_CHARS` | `120000` | MCP text result 最大字符数，超出会截断 |
| `NGM_MCP_ALLOW_WRITE` | `false` | 是否允许已确认的 write 工具执行 |
| `NGM_MCP_ALLOW_EXECUTE` | `false` | 是否允许已确认的 execute 工具执行 |
| `NGM_MCP_ALLOW_DANGEROUS` | `false` | 是否允许 dangerous 工具执行；当前高危工具未开放 |

不再支持：

```text
SL_HUB_V2_*
NGM_HUB_V2_*
OPENCODE_CONFIG
OPENCODE_CONFIG_CONTENT
OpenCode 自动配置扫描
Claude settings 自动配置扫描
~/.ng-manager/hub-v2.json
~/.sl-hub-v2.json
~/.codex/sl-hub-v2.json
~/.openclaw/sl-hub-v2.json
```

## 5. agent-connections.json 格式

推荐持久配置文件：

```text
~/.ng-manager/agent-connections.json
```

示例：

```json
{
  "version": 1,
  "hubV2": {
    "defaultProject": "ng-manager",
    "projects": {
      "ng-manager": {
        "baseUrl": "http://127.0.0.1:7001",
        "projectKey": "ng-manager",
        "projectToken": "xxx",
        "personalToken": "yyy",
        "source": "ng-manager-ui"
      }
    }
  }
}
```

多项目示例：

```json
{
  "version": 1,
  "hubV2": {
    "defaultProject": "main",
    "projects": {
      "main": {
        "baseUrl": "http://127.0.0.1:7001",
        "projectKey": "main",
        "projectToken": "xxx",
        "personalToken": "yyy"
      },
      "demo": {
        "baseUrl": "http://127.0.0.1:7001",
        "projectKey": "demo",
        "projectToken": "aaa",
        "personalToken": "bbb"
      }
    }
  }
}
```

当存在多个项目且没有 `defaultProject` 时，MCP Server 会要求 tool call 明确传入 `project`，并返回类似错误：

```text
multiple projects configured; pass project
```

## 6. Token 使用边界

Hub V2 MCP tools 的 token 使用规则：

| Token | 用途 |
| --- | --- |
| Project Token | 文档、项目、Issue、RD 等只读工具 |
| Personal Token | Issue/RD 创建、更新、评论、阶段推进、Markdown 图片上传等写操作 |

安全要求：

- `agent-connections.json` 可能包含敏感 token，应视为本地 secret 文件
- token 不允许进入 Git
- token 不允许作为 MCP tool 参数传入
- token 不允许在日志、Agent 回复、MCP result summary 或错误 detail 中明文输出
- project summary 只能返回 `hasProjectToken`、`hasPersonalToken` 等布尔信息
- HTTP 错误转换不得包含 Authorization header

## 7. 写工具确认与 policy

MCP Server 对工具使用 risk level：

```text
read
write
execute
dangerous
```

默认策略：

```text
read      allowed
write     blocked
execute   blocked
dangerous blocked
```

`packages/mcp-server/src/policy/tool-policy.ts` 中的 policy 环境变量对应关系：

| risk level | 默认 | 环境变量 |
| --- | --- | --- |
| `read` | allowed | 无需环境变量 |
| `write` | blocked | `NGM_MCP_ALLOW_WRITE=true` |
| `execute` | blocked | `NGM_MCP_ALLOW_EXECUTE=true` |
| `dangerous` | blocked | `NGM_MCP_ALLOW_DANGEROUS=true` |

受控工具执行规则：

- `confirm` 缺省或 `confirm=false`：只返回 preview
- `confirm=true` 且 `NGM_MCP_ALLOW_WRITE=false`：返回 policy blocked
- `confirm=true` 且 `NGM_MCP_ALLOW_WRITE=true`：执行真实写请求
- `confirm=true` 且 `NGM_MCP_ALLOW_EXECUTE=false`：返回 policy blocked
- `confirm=true` 且 `NGM_MCP_ALLOW_EXECUTE=true`：执行真实受控执行请求

这保证 Agent 可以先生成可审核的操作预览，只有用户确认且 MCP policy 放行时才执行写入或执行操作。

本地临时启用写入和执行工具：

```powershell
$env:NGM_MCP_ALLOW_WRITE = "true"
$env:NGM_MCP_ALLOW_EXECUTE = "true"
ngm mcp doctor
ngm mcp
```

MCP Client 配置示例：

```json
{
  "mcpServers": {
    "ng-manager": {
      "command": "ngm",
      "args": ["mcp"],
      "env": {
        "NGM_DATA_DIR": "C:/Users/you/.ng-manager",
        "NGM_WORKSPACE_ROOT": "D:/ng-manager",
        "NGM_MCP_ALLOW_WRITE": "true",
        "NGM_MCP_ALLOW_EXECUTE": "true",
        "NGM_MCP_ALLOW_DANGEROUS": "false"
      }
    }
  }
}
```

`ngm mcp doctor` 可用于检查当前 MCP Server 进程能看到的 policy 状态。若写操作返回 `write tools are disabled`，说明当前启动该 MCP Server 的环境中没有设置 `NGM_MCP_ALLOW_WRITE=true`，或 MCP Client 修改配置后尚未重启 server。execute/dangerous 同理分别由 `NGM_MCP_ALLOW_EXECUTE`、`NGM_MCP_ALLOW_DANGEROUS` 控制。

## 8. 当前 MCP 工具

### 8.1 NGM 本地工具

发现与路由：

```text
ngm.capabilities
ngm.routeTask
```

Workspace：

```text
ngm.workspace.summary
ngm.workspace.listPackages
ngm.workspace.getPackage
ngm.workspace.mcpTools
ngm.workspace.capabilityMap
```

Project：

```text
ngm.project.list
ngm.project.find
ngm.project.get
ngm.project.getScripts
ngm.project.readPackageJson
ngm_project_run_script
ngm_project_stop
ngm_project_list_tasks
ngm_project_task_status
ngm_project_task_logs
ngm_project_port_check
ngm_project_health_check
```

Task：

```text
ngm.task.list
ngm.task.getStatus
```

Log：

```text
ngm.log.tail
ngm.log.search
```

Git：

```text
ngm.git.status
ngm.git.diff
```

Runtime：

```text
ngm.runtime.current
ngm.runtime.list
ngm.runtime.resolveForProject
ngm.runtime.detectRequirement
ngm_runtime_set_for_project
```

Nginx：

```text
ngm.nginx.status
ngm.nginx.servers.list
ngm.nginx.server.get
ngm.nginx.upstreams.list
ngm.nginx.config.validate
ngm.nginx.config.getMain
ngm.nginx.logs.tail
ngm_nginx_reload
ngm_nginx_proxy_save
```

兼容 Proxy：

```text
ngm.proxy.list
ngm.proxy.validate
```

受控本地工具：

| 工具 | risk | 默认行为 | 确认执行条件 |
| --- | --- | --- | --- |
| `ngm_project_run_script` | execute | 预览 package.json script 启动计划；确认后通过本地 ng-manager server 启动并返回 `launch.status` | `confirm=true` + `NGM_MCP_ALLOW_EXECUTE=true` |
| `ngm_project_stop` | execute | 预览将停止的受管 task；确认后优先通过本地 ng-manager server 停止 | `confirm=true` + `NGM_MCP_ALLOW_EXECUTE=true` |
| `ngm_runtime_set_for_project` | write | 预览 runtime binding diff；确认后通过本地 ng-manager server 写入 | `confirm=true` + `NGM_MCP_ALLOW_WRITE=true` + local server available |
| `ngm_nginx_reload` | execute | 校验 Nginx config 并预览 reload | `confirm=true` + `NGM_MCP_ALLOW_EXECUTE=true` |
| `ngm_nginx_proxy_save` | write | 预览代理 server block 写入 | `confirm=true` + `NGM_MCP_ALLOW_WRITE=true` |

项目脚本执行使用当前本地 ng-manager server 作为控制面，server 地址来自 `packages/runtime` 维护的 lock 文件，也可通过 `NGM_MCP_SERVER_URL` 或 `NGM_SERVER_URL` 显式指定。这样 MCP 启动的 task 会进入 UI 使用的同一套 task runtime 和 WebSocket 事件流。启动工具返回的 `launch.status` 用于区分 `ready`、`running`、`failed`、`success`、`stopped` 或 `unknown`，Agent 不应只根据进程创建结果宣称启动成功。

项目运行观测工具：

| 工具 | risk | 用途 | 边界 |
| --- | --- | --- | --- |
| `ngm_project_list_tasks` | read | 列出本地 server 共享 task runtime 中的受管任务 | server 未启动时返回 `unavailable`，不自动启动 |
| `ngm_project_task_status` | read | 查看单个 task 的运行态、PID 存在性、退出码和错误摘要 | 只读共享 task runtime |
| `ngm_project_task_logs` | read | 读取受管 task/run 的有限日志 tail | 限制行数/字符数并脱敏 token/password/secret/authorization |
| `ngm_project_port_check` | read | 检查单个本地 host/port 是否监听 | 不执行 shell，不扫描端口范围 |
| `ngm_project_health_check` | read | 检查本地 HTTP/HTTPS URL 是否可访问 | 只支持本地 URL 或 task runtime 推导 URL，短超时，小响应预览 |

这些观测工具不创建第二套 task 状态中心。涉及 taskId、PID、日志、进程生命周期的查询必须优先依赖已运行的 `packages/server`；如果 server 未启动，应提示先运行 `ngm server` 或 `ngm ui`。

当前仍不开放：

```text
安装/卸载/切换 Node 版本
启动/停止 Nginx
任意 shell 执行
任意 PID kill
任意文件路径写入
系统 PATH、nvm 配置或 shell profile 修改
```

### 8.2 Hub V2 工具

项目配置：

```text
hub_v2_projects_list
hub_v2_projects_get
hub_v2_project_members_list
```

文档：

```text
hub_v2_docs_list
hub_v2_docs_get
hub_v2_docs_get_by_slug
```

Issue：

```text
hub_v2_issues_list
hub_v2_issues_get
hub_v2_issues_create
hub_v2_issues_comment
hub_v2_issues_assign
hub_v2_issues_update
```

RD：

```text
hub_v2_rd_list
hub_v2_rd_get
hub_v2_rd_stage_tasks_list
hub_v2_rd_create
hub_v2_rd_advance_stage
hub_v2_rd_stage_tasks_create
hub_v2_rd_update_progress
```

上传：

```text
hub_v2_upload_markdown_image
```

不注册旧工具别名：

```text
sl_hub_v2.*
```

## 9. Markdown 图片上传流程

`hub_v2_upload_markdown_image` 用于给 RD 描述、RD 阶段任务描述、Issue 描述和 Issue 评论插入 Markdown 图片。

推荐流程：

1. Agent 调用 `hub_v2_upload_markdown_image`
2. MCP tool 使用 Personal Token 调用 Hub V2 markdown image upload endpoint
3. Hub V2 返回可直接插入正文的 Markdown
4. Agent 将返回的 Markdown 放入 RD/Issue/评论正文
5. 创建或更新业务对象时，Hub V2 业务服务执行 Markdown upload promote

返回 Markdown 形态：

```markdown
![image.png](/api/admin/uploads/upl_xxx/raw)
```

上传工具限制：

- 输入支持 `filePath` 或 `contentBase64 + fileName`
- `filePath` 只允许位于 `NGM_WORKSPACE_ROOT` 或 `NGM_MCP_UPLOAD_ROOT` 下
- 默认最大上传大小为 5MB
- 可通过 `NGM_MCP_MAX_UPLOAD_BYTES` 调整
- 默认只 preview，不读取大文件、不上传
- 只有 `confirm=true` 且写 policy 放行时才上传

## 10. 错误与输出治理

Hub V2 HTTP 错误会转换为结构化 MCP error：

```json
{
  "ok": false,
  "tool": "hub_v2_docs_get",
  "error": "document not found",
  "status": 404,
  "code": "DOCUMENT_NOT_FOUND",
  "detail": {}
}
```

需要保留的典型 Hub V2 错误码：

```text
TOKEN_SCOPE_FORBIDDEN
TOKEN_PROJECT_FORBIDDEN
PROJECT_NOT_FOUND
DOCUMENT_NOT_FOUND
DOCUMENT_SLUG_EXISTS
```

MCP 输出大小限制：

- 环境变量：`NGM_MCP_MAX_RESULT_CHARS`
- 默认值：`120000`
- 超出时返回 `truncated: true` 和 `originalLength`

## 11. 本地调试

构建和测试：

```bash
npm.cmd run test -w @yinuo-ngm/mcp-server
npm.cmd run build
```

启动 MCP：

```bash
ngm mcp
```

MCP Inspector 调试开发态：

```bash
npm.cmd run inspect:dev -w @yinuo-ngm/mcp-server
```

Inspector 页面如果需要手动配置 stdio server，可使用：

```text
Command: npx.cmd
Arguments: tsx D:/ng-manager/packages/mcp-server/src/index.ts
```

或调试构建产物：

```text
Command: node
Arguments: D:/ng-manager/packages/mcp-server/lib/index.js
```

## 12. 验收口径

代码层验收：

```bash
npm.cmd run test -w @yinuo-ngm/mcp-server
npm.cmd run build
```

配置层验收：

- 默认读取 `~/.ng-manager/agent-connections.json`
- `HUB_V2_CONFIG` 可指向自定义配置文件
- `HUB_V2_*` 环境变量优先于配置文件
- 多项目无 `defaultProject` 时必须传 `project`
- `projectKey` 参数只覆盖 project key，不丢弃已选项目 token
- project summary 不包含 token 原文
- legacy 配置入口不再生效

## 13. 后续演进

当前阶段不让 MCP Server 读取 `packages/server` SQLite。

后续可由 `packages/server` 或 UI 管理同一个 JSON 文件：

- UI 入口：`设置 / AI Agent / MCP / Hub V2 Connection`
- GET 只返回 token 是否配置和 token preview，不返回明文 token
- 写入使用临时文件 + rename 原子替换
- 尽量设置本地文件权限为 `0600`

长期演进方向：

- SQLite 只保存 connection metadata
- token 迁移到 Secret Store 或加密文件
- MCP Server 继续保持独立启动，不直接依赖 `packages/server` 或 SQLite
