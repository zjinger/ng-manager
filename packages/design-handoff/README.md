# Design Handoff 使用指南

## 概述

`@yinuo-ngm/design-handoff` 是一个 AI 友好的设计交接工具，用于将 Sketch 设计稿转换为结构化数据，便于 AI Agent 自动生成前端代码。

## 功能特性

- ✅ 直接解析 `.sketch` 文件（无需安装 Sketch 插件）
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

### 1. 查看 .sketch 文件中的页面和画板

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "<sketch文件路径>" --list
```

**示例：**

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "C:\Users\<用户名>\Desktop\sketch\核心网2026推广.sketch" --list
```

**输出示例：**

```json
{
  "pages": [
    {
      "index": 0,
      "id": "C2061E10-1378-44B0-9BB1-29CD5AE6B46C",
      "name": "✅0-登录页",
      "artboards": [
        {
          "name": "7-图形验证码",
          "frame": { "width": 1920, "height": 937, "x": -6099, "y": 83 }
        },
        {
          "name": "8-滑动验证",
          "frame": { "width": 1920, "height": 937, "x": -4052, "y": 84 }
        }
      ]
    },
    {
      "index": 1,
      "name": "✅1-设备新增-0310",
      "artboards": [...]
    }
  ]
}
```

### 2. 解析 .sketch 文件

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "<sketch文件路径>" --out "<输出目录>"
```

**参数说明：**

| 参数 | 必需 | 说明 |
|------|------|------|
| `--file` | ✅ | .sketch 文件路径 |
| `--out` | ❌ | 输出目录（不指定则不写入文件） |
| `--page` | ❌ | 页面索引（默认为 0） |
| `--artboard` | ❌ | 画板名称（默认使用第一个画板） |
| `--list` | ❌ | 列出所有页面和画板 |
| `--all` | ❌ | 解析指定页面的所有画板 |

**示例：**

```bash
# 解析默认页面的第一个画板
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "design.sketch" --out "output"

# 解析指定页面的指定画板
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "design.sketch" --out "output" --page 7 --artboard "1综合管理-海区链路版本控制-1）默认列表"

# 解析指定页面的所有画板
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "design.sketch" --out "output" --page 7 --all
```

**输出示例：**

```json
{
  "outputDir": "C:\\Users\\<用户名>\\Desktop\\sketch\\output",
  "warnings": [
    "App version 83.2 may have features not fully supported"
  ],
  "summary": {
    "documentName": "核心网2026推广",
    "pageName": "✅7-国家中心系统-0601",
    "artboardName": "1综合管理-海区链路版本控制-1）默认列表",
    "textCount": 45,
    "componentCount": 2
  }
}
```

**使用 `--all` 参数的输出示例：**

```json
{
  "outputRoot": "C:\\Users\\<用户名>\\Desktop\\sketch\\output",
  "pageName": "✅7-国家中心系统-0601",
  "totalArtboards": 28,
  "parsedArtboards": 28,
  "warnings": ["App version 83.2 may have features not fully supported"],
  "artboards": [
    {
      "artboardName": "0国家中心系统-导航下拉菜单项",
      "outputDir": "C:\\Users\\<用户名>\\Desktop\\sketch\\output\\0国家中心系统-导航下拉菜单项",
      "textCount": 15,
      "componentCount": 0
    },
    {
      "artboardName": "1综合管理-海区链路版本控制-1）默认列表",
      "outputDir": "C:\\Users\\<用户名>\\Desktop\\sketch\\output\\1综合管理-海区链路版本控制-1-默认列表",
      "textCount": 150,
      "componentCount": 2
    }
  ]
}
```

### 3. 扫描交接包

```bash
npm run handoff:scan -w @yinuo-ngm/design-handoff -- --root "<交接包根目录>"
```

**示例：**

```bash
npm run handoff:scan -w @yinuo-ngm/design-handoff -- --root "C:\Users\<用户名>\Desktop\sketch"
```

### 4. 创建 AI Agent 任务

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

```
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

```
tasks/
└── artboard-name/
    ├── prompt.md       # 任务描述和要求
    ├── context.json    # 完整上下文信息
    └── screenshot.png  # 视觉参考（如果有）
```

---

## API 使用

### 解析 .sketch 文件

```typescript
import { parseSketchFile } from '@yinuo-ngm/design-handoff';

const result = await parseSketchFile({
  sketchFilePath: '/path/to/design.sketch',
  outputDir: '/path/to/output',
  artboardName: 'LoginPage',
  pageIndex: 0,
});

console.log(result.handoff.meta.artboardName);
console.log(result.handoff.texts);
console.log(result.handoff.styles);
console.log(result.handoff.tokens);
console.log(result.handoff.components);
```

### 批量解析 .sketch 文件的所有画板

```typescript
import { parseSketchFileAllArtboards } from '@yinuo-ngm/design-handoff';

const result = await parseSketchFileAllArtboards({
  sketchFilePath: '/path/to/design.sketch',
  outputRoot: '/path/to/output',
  pageIndex: 7, // 指定页面索引
});

console.log(`Page: ${result.pageName}`);
console.log(`Total artboards: ${result.totalArtboards}`);
console.log(`Parsed artboards: ${result.results.length}`);

// 遍历每个画板的结果
for (const artboard of result.results) {
  console.log(`- ${artboard.handoff.meta.artboardName}: ${artboard.handoff.texts.length} texts`);
}
```

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

### 步骤 1：查看 .sketch 文件中的页面和画板

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "设计稿.sketch" --list
```

### 步骤 2：解析指定画板

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "设计稿.sketch" --out "handoff-output" --page 7 --artboard "1综合管理-海区链路版本控制-1）默认列表"
```

### 步骤 2（批量）：解析指定页面的所有画板

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "设计稿.sketch" --out "handoff-output" --page 7 --all
```

### 步骤 3：创建 AI Agent 任务

```bash
npm run handoff:task -w @yinuo-ngm/design-handoff -- --package "handoff-output" --target-project "my-angular-app"
```

### 步骤 4：AI Agent 读取任务并生成代码

AI Agent 读取任务目录中的 `prompt.md` 和 `context.json`，根据设计数据生成前端代码。

---

## 版本兼容性

| Sketch 版本 | 兼容性 | 说明 |
|-------------|--------|------|
| 55.2 - 71 | ✅ 完全兼容 | 基础功能完全支持 |
| 72 - 83 | ✅ 基本兼容 | 基础功能支持，部分新特性可能不支持 |
| 84+ | ⚠️ 部分兼容 | 基础功能支持，新特性可能不支持 |
| 2025.x, 2026.x | ⚠️ 部分兼容 | 新版本格式，基础功能支持 |

---

## 常见问题

### Q: 如何查看 .sketch 文件中有哪些页面和画板？

A: 使用 `--list` 参数：

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "design.sketch" --list
```

### Q: 解析时报错 "Artboard not found" 怎么办？

A: 
1. 先使用 `--list` 查看所有页面和画板
2. 确认画板名称是否完全匹配（包括空格和特殊字符）
3. 使用 `--page` 参数指定正确的页面索引

### Q: 如何解析特定页面的画板？

A: 使用 `--page` 和 `--artboard` 参数：

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "design.sketch" --out "output" --page 7 --artboard "画板名称"
```

### Q: 如何一次性解析一个页面的所有画板？

A: 使用 `--all` 参数：

```bash
npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file "design.sketch" --out "output" --page 7 --all
```

这会将页面中的每个画板解析到独立的子目录中。

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

---

## 更新日志

### v0.2.1

- ✨ 新增 `--all` 参数，支持批量解析指定页面的所有画板
- ✨ 新增 `parseSketchFileAllArtboards` API

### v0.2.0

- ✨ 新增直接解析 .sketch 文件功能
- ✨ 新增 `--list` 参数，支持查看所有页面和画板
- ✨ 新增版本兼容性检查
- 📦 添加 jszip 依赖
