# Design Handoff 使用指南

## 概述

`@yinuo-ngm/design-handoff` 是一个 AI 友好的设计交接工具，用于将已导出的设计交接包转换为结构化数据，便于 AI Agent 自动生成前端代码。

设计交接包（Handoff Package）由配套的 Sketch 插件 `ngm-ai-handoff` 生成（源码见 `sketchplugin/`，可通过 `npm run pack:sketch` 打包）。本包负责对交接包做解析、校验、扫描与 AI Agent 任务生成。

## 功能特性

- ✅ 解析已导出的交接包（JSON 格式）
- ✅ 生成 AI Agent 任务（prompt.md + context.json）
- ✅ 支持目标项目配置（Profile）
- ✅ 扫描目录下的所有交接包

---

## 安装

```bash
npm install @yinuo-ngm/design-handoff
```

---

## CLI 命令

### 1. 扫描交接包

```bash
npm run handoff:scan -w @yinuo-ngm/design-handoff -- --root "<交接包根目录>"
```

**示例：**

```bash
npm run handoff:scan -w @yinuo-ngm/design-handoff -- --root "C:\\Users\\<用户名>\\Desktop\\sketch"
```

### 2. 创建 AI Agent 任务

```bash
npm run handoff:task -w @yinuo-ngm/design-handoff -- --package "<交接包目录>"
```

**参数说明：**

| 参数 | 必需 | 说明 |
|------|------|------|
| `--package` | ✅ | 交接包目录路径 |
| `--out` | ❌ | 任务输出根目录 |
| `--slug` | ❌ | 任务标识符 |
| `--target-project` | ❌ | 目标项目根目录 |
| `--profile` | ❌ | 目标项目配置文件或目录 |
| `--route` | ❌ | 目标路由 |
| `--target-path` | ❌ | 输出路径（AI Agent生成代码的目标位置） |
| `--target-app` | ❌ | 目标应用名称或路径 |
| `--artifact` | ❌ | 产物类型（static-html 或 framework-component） |

**示例：**

```bash
# 使用目标项目配置
npm run handoff:task -w @yinuo-ngm/design-handoff -- --package "output" --target-project "my-angular-app"

# 手动指定参数
npm run handoff:task -w @yinuo-ngm/design-handoff -- --package "output" --target-app "my-app" --route "/login" --target-path "src/app/pages/login" --artifact framework-component
```

---

## 输出文件结构

### 交接包结构

```text
output/
├── meta.json           # 元信息（文档名、页面名、画板名、导出时间）
├── layer-tree.json     # 图层树结构（层级、位置、尺寸）
├── texts.json          # 文本内容（字体、字号、颜色）
├── styles.json         # 样式信息（填充、边框、圆角、阴影）
├── tokens.json         # 设计 Token（颜色、字号、圆角的规范值）
├── components.json     # 推断的组件（按钮、输入框、表格等）
├── assets-map.json     # 资源映射（截图路径、警告信息）
└── agent-prompt.md     # AI Agent 提示词
```

### AI Agent 任务结构

```text
tasks/
└── artboard-name/
    ├── prompt.md       # 任务描述和要求
    ├── context.json    # 完整上下文信息
    └── screenshot.png  # 视觉参考（如果有）
```

---

## API 使用

### 解析已导出的交接包

```typescript
import { parseHandoffPackage } from '@yinuo-ngm/design-handoff';

const handoff = parseHandoffPackage('/path/to/handoff-package');
```

### 创建 AI Agent 任务

```typescript
import { createHandoffAgentTask } from '@yinuo-ngm/design-handoff';

const task = createHandoffAgentTask({
  packageDir: '/path/to/handoff-package',
  targetProject: '/path/to/target-project',
  targetRoute: '/login',
  targetPath: 'src/app/pages/login',
  artifactType: 'framework-component',
});
```

### 扫描交接包

```typescript
import { scanHandoffPackages } from '@yinuo-ngm/design-handoff';

const summaries = scanHandoffPackages('/path/to/handoffs');
```

---

## 目标项目配置

在目标项目根目录创建 `.ngm-handoff.json` 文件：

```json
{
  "name": "my-angular-app",
  "projectRoot": ".",
  "framework": "angular",
  "uiLibrary": "ng-zorro",
  "artifactType": "framework-component",
  "outputPath": "src/app/pages/login",
  "route": "/login",
  "styleGuide": [
    "src/styles.less",
    "src/app/shared/ui"
  ],
  "referenceFiles": [
    "package.json",
    "src/app/app.routes.ts"
  ],
  "buildCommand": "npm run build",
  "implementationRules": [
    "Use NzButtonModule for buttons",
    "Use NzInputModule for inputs",
    "Follow existing component structure"
  ]
}
```

---

## 完整工作流程示例

### 步骤 1：使用 Sketch 插件导出交接包

在 Sketch 中通过 `NGM AI Handoff` 插件导出选中画板 / 当前页面 / 整个文档，得到交接包目录（包含上述 `meta.json`、`layer-tree.json` 等文件）。

### 步骤 2：创建 AI Agent 任务

```bash
npm run handoff:task -w @yinuo-ngm/design-handoff -- --package "handoff-output" --target-project "my-angular-app"
```

### 步骤 3：AI Agent 读取任务并生成代码

AI Agent 读取任务目录中的 `prompt.md` 和 `context.json`，根据设计数据生成前端代码。

---

## 常见问题

### Q: 生成的交接包包含哪些信息？

A: 交接包包含以下文件：
- `meta.json` - 元信息
- `layer-tree.json` - 图层树结构
- `texts.json` - 文本内容
- `styles.json` - 样式信息
- `tokens.json` - 设计 Token
- `components.json` - 推断的组件
- `assets-map.json` - 资源映射
- `agent-prompt.md` - AI Agent 提示词

### Q: 如何生成设计交接包？

A: 使用配套的 Sketch 插件 `ngm-ai-handoff`（位于 `sketchplugin/` 目录）。在 Windows 侧执行 `npm run pack:sketch` 打包得到 `.sketchplugin.zip`，复制到 Mac 解压安装后即可在 Sketch 中导出交接包。

---

## 更新日志

### v0.2.0

- ✅ 解析已导出的交接包
- ✅ 生成 AI Agent 任务
- ✅ 目标项目配置（Profile）
- ✅ 扫描交接包
