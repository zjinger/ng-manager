# Hub V2 Mobile — Design System

## Design Tokens

### Colors (Dark Theme)

```typescript
const colors = {
  primary:    '#6366F1',  // Indigo-500 — 主操作色
  background: '#0F1117',  // 深色背景
  surface:    '#161822',  // 卡片/面板背景
  text:       '#E4E6ED',  // 主文字
  textSecondary: '#8B8FA3', // 次要文字
  success:    '#10B981',  // 成功/完成
  warning:    '#F59E0B',  // 警告/进行中
  danger:     '#EF4444',  // 错误/阻塞
  info:       '#3B82F6',  // 信息/链接
  border:     '#2A2D3A',  // 边框
}
```

### Colors (Light Theme)

浅色主题不是重新设计一套产品，而是同一套 Hub V2 Mobile 信息架构在 light mode 下的语义 token。实现端必须用语义变量适配主题，不要把深色稿里的颜色硬编码到组件里。

```typescript
const lightColors = {
  primary:    '#6366F1',  // Indigo-500 — 主操作色，保持品牌识别
  primaryLight: '#818CF8',
  primaryDark:  '#4F46E5',
  background: '#F7F8FA',  // App 页面背景
  surface:    '#FFFFFF',  // 卡片/输入框/底部导航
  surfaceElevated: '#F3F4F6', // 次级面板/弱分组背景
  text:       '#111827',  // 主文字
  textSecondary: '#6B7280', // 次要文字
  textMuted:  '#9CA3AF',  // 辅助文字/占位符
  success:    '#10B981',
  warning:    '#F59E0B',
  danger:     '#EF4444',
  info:       '#3B82F6',
  border:     '#E5E7EB',
  divider:    '#EEF0F4',
}
```

### Theme Contract

```typescript
type HubTheme = {
  primary: string
  primaryLight: string
  primaryDark: string
  background: string
  surface: string
  surfaceElevated: string
  text: string
  textSecondary: string
  textMuted: string
  success: string
  warning: string
  danger: string
  info: string
  border: string
  divider: string
}

export const hubThemes = {
  dark: {
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    background: '#0F1117',
    surface: '#161822',
    surfaceElevated: '#1F2230',
    text: '#E4E6ED',
    textSecondary: '#8B8FA3',
    textMuted: '#666B80',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    border: '#2A2D3A',
    divider: '#222635',
  },
  light: {
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceElevated: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    border: '#E5E7EB',
    divider: '#EEF0F4',
  },
} satisfies Record<'dark' | 'light', HubTheme>
```

### Light Theme Rules

- 页面背景使用 `light.background`，卡片、输入框、Bottom Tab 使用 `light.surface`。
- 二级分组、轻量筛选条、弱状态块使用 `light.surfaceElevated`。
- 主文字使用 `light.text`，说明文字使用 `light.textSecondary`，占位符和元信息使用 `light.textMuted`。
- Primary 保持 `#6366F1`，不要因为浅色主题改成蓝色或灰色。
- 状态色保持与深色主题一致，但状态背景要使用 10% 到 14% 透明度的浅底，例如 `#10B9811A`、`#F59E0B1A`。
- 边框使用 `light.border`，列表分隔线使用 `light.divider`，不要使用纯黑或高对比灰线。
- 浅色主题仍然是专业研发协作工具，不要做成营销页、后台表格或大面积品牌渐变。

### Border Radius

```typescript
const radius = {
  card:  16,
  hero:  24,
  input: 14,
  badge: 8,
  full:  9999,
}
```

### Typography

```typescript
const typography = {
  display:  { size: 28, weight: '700', lineHeight: 36 },
  title:    { size: 20, weight: '600', lineHeight: 28 },
  subtitle: { size: 16, weight: '500', lineHeight: 24 },
  body:     { size: 14, weight: '400', lineHeight: 20 },
  caption:  { size: 12, weight: '400', lineHeight: 16 },
}
```

### Spacing

```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
}
```

### Frame

- iOS: 390 × 844 (iPhone 15 Pro)
- Android: 412 × 900

---

## Component Specs

### Badge

```typescript
// 状态 Badge
const badgeVariants = {
  '进行中': { bg: '#F59E0B20', text: '#F59E0B', border: '#F59E0B40' },
  '待处理': { bg: '#6366F120', text: '#6366F1', border: '#6366F140' },
  '待验证': { bg: '#3B82F620', text: '#3B82F6', border: '#3B82F640' },
  '已完成': { bg: '#10B98120', text: '#10B981', border: '#10B98140' },
  '阻塞':   { bg: '#EF444420', text: '#EF4444', border: '#EF444440' },
}
```

```typescript
// Light Theme 状态 Badge
const lightBadgeVariants = {
  '进行中': { bg: '#F59E0B1A', text: '#B45309', border: '#F59E0B33' },
  '待处理': { bg: '#6366F11A', text: '#4F46E5', border: '#6366F133' },
  '待验证': { bg: '#3B82F61A', text: '#2563EB', border: '#3B82F633' },
  '已完成': { bg: '#10B9811A', text: '#047857', border: '#10B98133' },
  '阻塞':   { bg: '#EF44441A', text: '#DC2626', border: '#EF444433' },
}
```

### Card

```typescript
const cardStyle = {
  background: colors.surface,
  borderRadius: radius.card,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
}
```

```typescript
const lightCardStyle = {
  background: lightColors.surface,
  borderRadius: radius.card,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: lightColors.border,
}
```

### Button

```typescript
const buttonStyles = {
  primary: {
    background: colors.primary,
    color: '#FFFFFF',
    borderRadius: radius.input,
    height: 48,
  },
  secondary: {
    background: 'transparent',
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: radius.input,
    height: 48,
  },
}
```

```typescript
const lightButtonStyles = {
  primary: {
    background: lightColors.primary,
    color: '#FFFFFF',
    borderRadius: radius.input,
    height: 48,
  },
  secondary: {
    background: lightColors.surface,
    color: lightColors.primary,
    border: `1px solid ${lightColors.border}`,
    borderRadius: radius.input,
    height: 48,
  },
}
```

### Tab Bar

```typescript
const tabBar = {
  height: 64,
  background: colors.surface,
  borderTop: `1px solid ${colors.border}`,
  activeColor: colors.primary,
  inactiveColor: colors.textSecondary,
}
```

```typescript
const lightTabBar = {
  height: 64,
  background: lightColors.surface,
  borderTop: `1px solid ${lightColors.border}`,
  activeColor: lightColors.primary,
  inactiveColor: lightColors.textMuted,
}
```

---

## Navigation Structure

```
Bottom Tabs (4)
├── 工作台 (Dashboard)  — icon: grid
├── 待办 (Todo)         — icon: check-square
├── 消息 (Messages)     — icon: bell
└── 我的 (Profile)      — icon: user
```

### Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | 登录页，服务器地址+用户名+密码 |
| Dashboard | `/` (工作台 Tab) | 待办统计 + 研发项进度 + 公告 |
| TodoList | `/todo` (待办 Tab) | Issue/RD/Review 统一待办列表 |
| TodoDetail | `/todo/[id]` | 待办详情，评论+状态流转 |
| MessageCenter | `/messages` (消息 Tab) | 通知聚合列表 |
| MessageDetail | `/messages/[id]` | 通知/公告详情 |
| Profile | `/profile` (我的 Tab) | 用户信息+设置入口 |

---

## Icon Reference

使用 `@expo/vector-icons` 的 `Feather` 图标集：

| Tab | 图标名 |
|-----|--------|
| 工作台 | `grid` |
| 待办 | `check-square` |
| 消息 | `bell` |
| 我的 | `user` |
| 返回 | `arrow-left` |
| 更多 | `more-horizontal` |
| 评论 | `message-circle` |
| 搜索 | `search` |
| 设置 | `settings` |
| 切换项目 | `repeat` |
| 退出 | `log-out` |

---

## Design Files Reference

每个页面的完整 HTML 设计稿在同目录下：

| 文件 | 页面 |
|------|------|
| `00-cover.html` | 设计稿封面 |
| `01-design-system.html` | Design System 组件展示 |
| `02-login.html` | 登录页 |
| `03-dashboard.html` | 工作台 Dashboard |
| `04-todo-list.html` | 待办列表 |
| `05-todo-detail.html` | 待办详情 |
| `06-message-center.html` | 消息中心 |
| `07-message-detail.html` | 消息详情 |
| `08-profile.html` | 个人中心 |
