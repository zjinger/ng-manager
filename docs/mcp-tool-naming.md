# MCP Tool Naming

## 1. 命名格式

正式 MCP Tool 名称统一使用 `snake_case`：

```text
<prefix>_<domain>_<resource?>_<action>
```

## 2. 前缀规则

只允许以下前缀：

- `ngm_`：ng-manager 本地控制面能力
- `hub_v2_`：Hub V2 平台 API 能力

禁止新增：

- `hubv2_`
- `sl_hub_v2_`
- `ng_manager_`
- `ngmLocal_`
- `dot.case`
- `camelCase`

## 3. 动词规则

| 语义 | 推荐动词 |
|---|---|
| 查询列表 | `list` |
| 查询详情 | `get` |
| 创建 | `create` |
| 更新 | `update` |
| 删除 | `delete` |
| 保存配置 | `save` |
| 执行脚本 | `run_script` |
| 启动 | `start` |
| 停止 | `stop` |
| 状态 | `status` |
| 解析 | `resolve` |
| 校验 | `validate` |

## 4. 示例

```text
ngm_project_run_script
ngm_runtime_set_for_project
ngm_nginx_proxy_save
ngm_workspace_list_packages
hub_v2_docs_get
hub_v2_issues_update
```

## 5. 禁止写法

```text
project.runScript
projectRunScript
runtime.setForProject
ngm.doctor
ngm.file.write
hubv2DocsRead
```

## 6. Skill 文档引用规则

- Skill 文档中引用 MCP Tool 名时，必须使用**真实注册名**。
- 使用反引号标注，例如：

```md
- `ngm_project_run_script`
- `ngm_runtime_resolve_for_project`
- `hub_v2_docs_get_by_slug`
```

- 如果文档在描述 REST API 而非 MCP Tool，必须明确标注为 REST endpoint，不得混用为 MCP Tool 名称。

## 7. Deprecated Alias 策略

- 迁移期间允许保留旧名称 alias（如 `dot.case`）到新 `snake_case` 正式名。
- alias 的 description 必须带 `[Deprecated]` 标识，并指向 canonical 名称。
- capability/catalog/skills 默认展示 canonical 名称，alias 仅用于兼容旧调用方。
