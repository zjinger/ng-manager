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
