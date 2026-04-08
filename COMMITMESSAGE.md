# Commit Message 规范

本项目采用简洁、可长期维护的 Commit Message 规范，适用于工程型、长期演进项目。

---

# 一、基本格式

```bash
<type>(<scope>): <summary>
```

约定说明：

- 每条 commit 只做一件事
- 使用祈使句（add / fix / refactor / remove 等）
- summary 简洁明确，不超过一行

## 二、type 说明（核心）

| type     | 使用场景 | 说明                     |
| -------- | -------- | ------------------------ |
| feat     | 新功能   | 新增用户或系统能力       |
| fix      | 修复问题 | 修复 bug 或异常行为      |
| refactor | 重构     | 不改变功能，仅调整结构   |
| chore    | 工程杂项 | 初始化、依赖、脚本、配置 |
| docs     | 文档     | README、设计说明、注释   |
| style    | 风格调整 | 格式、lint，不影响逻辑   |
| test     | 测试     | 新增或调整测试代码       |

## 三、可选 type

| type   | 使用场景                                    |
| ------ | ------------------------------------------- |
| build  | 构建 / 打包相关（electron-builder、tsc 等） |
| ci     | CI/CD 流程配置                              |
| perf   | 性能优化                                    |
| revert | 回滚提交                                    |

## 四、scope 规范

scope 用于标明改动所属模块，建议但不强制使用。

### 推荐 scope 列表：

- desktop：Electron 主进程 / preload
- server：Fastify 本地服务
- webapp：Angular 前端应用
- core：框架无关核心逻辑
- infra：构建、脚本、工程配置
- docs：文档相关
- hub-v2：与 Hub 相关的改动

### 示例：

```plaintext
feat(server): add health check endpoint
fix(desktop): restart electron when main process changes
refactor(core): extract process manager
docs: update project setup guide
```

当改动涉及多个模块时，可以省略 scope：

```plaintext
chore: align development startup scripts
```

## 五、summary 编写规范

### 正确示例（动词 + 行为）：

- add health check endpoint
- bootstrap ng-manager2.0 project
- start local server on app launch
- inject server baseUrl into renderer

### 不推荐示例：

- update code
- fix bug
- test
- try something

## 六、示例汇总

### 初始化阶段：

- chore: bootstrap ng-manager2.0 project

### 功能开发：

- feat(server): add task run API
- feat(desktop): start local server on app launch
- fix(desktop): wait for server before creating window

### 重构与维护：

- refactor(core): decouple task runner from fastify
- build(desktop): adjust electron-builder config
- docs: add local-first architecture overview

## 七、项目 Commit 使用原则（强约束）

- 一次 commit 只做一件事
- 不在 commit message 中使用“临时 / 尝试 / test / wip”等词
- 初始化提交必须使用 chore 类型
- 展示型工程项目，commit message 必须可读、可回溯、可解释