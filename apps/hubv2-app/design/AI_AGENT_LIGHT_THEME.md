# Hub V2 Mobile — Light Theme Instructions for AI Agent

这份说明给实现端 AI agent 使用。当前 `design/*.html` 是 dark mode 视觉稿，但 App 必须支持 light mode。请不要照抄 HTML 里的深色颜色值，而是按下面的语义 token 实现主题。

## Product Positioning

Hub V2 Mobile 是研发协作随身端，不是移动管理后台。浅色主题仍然要保持开发工具、企业协作、移动优先的气质：清晰、克制、可扫描，重点服务提醒、处理、沟通、跟进。

## Light Theme Tokens

```ts
export const lightTheme = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F3F4F6',

  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  border: '#E5E7EB',
  divider: '#EEF0F4',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
}
```

## Component Rules

- Screen background: `background`
- Cards, forms, bottom tab bar, sheets: `surface`
- Filter chips, grouped panels, subtle blocks: `surfaceElevated`
- Primary text: `text`
- Secondary text and descriptions: `textSecondary`
- Placeholder, metadata, inactive tab text: `textMuted`
- Hairline borders: `border`
- List dividers and timeline separators: `divider`
- Primary CTA: `primary` background with white text
- Secondary button: white/surface background, `border`, `primary` text

## Status Badge Tokens

```ts
export const lightStatusTokens = {
  inProgress: { bg: '#F59E0B1A', text: '#B45309', border: '#F59E0B33' },
  pending: { bg: '#6366F11A', text: '#4F46E5', border: '#6366F133' },
  verifying: { bg: '#3B82F61A', text: '#2563EB', border: '#3B82F633' },
  done: { bg: '#10B9811A', text: '#047857', border: '#10B98133' },
  blocked: { bg: '#EF44441A', text: '#DC2626', border: '#EF444433' },
}
```

## Implementation Notes

- Build theme-aware components first: `Card`, `Badge`, `Button`, `Input`, `BottomTabBar`, `ListItem`, `BottomSheet`.
- Do not hardcode `#0F1117`, `#161822`, `#E4E6ED`, `#8B8FA3`, or `#2A2D3A` in React Native components.
- Use semantic theme values from a theme object or NativeWind CSS variables.
- Preserve the existing 390 x 844 mobile layout density and bottom-tab IA: 工作台、待办、消息、我的。
- Settings remain a Bottom Sheet, not a standalone page.
- Keep cards at 16px radius, inputs at 14px radius, badges at 8px radius.
- Avoid desktop tables, sidebars, admin-style dense management screens, and large marketing-style hero sections.

## Screen-Specific Light Theme Guidance

- Login: `background` page, white login panel, primary CTA, subtle bordered inputs.
- 工作台: white cards for 待办、研发项、公告；progress bars use `primary`, `success`, `warning` by state.
- 待办列表: filter chips use `surfaceElevated`; selected chip uses `primary` with white text.
- 待办详情: comments and activity timeline use white cards plus `divider`; bottom actions remain sticky.
- 消息中心: unread items can use a very light primary tint `#6366F10D`; read items stay white.
- 消息详情: content surface is white; Markdown body uses `text` and `textSecondary`.
- 我的: user card is white; destructive logout uses `danger` text, not a filled red button unless confirming.
- 服务器配置 / 项目切换: render as bottom sheets over light backdrop with white sheet surface.

## Acceptance Criteria

- The app can switch between `darkTheme` and `lightTheme` without changing screen structure.
- No component relies on dark-only hardcoded colors.
- Light mode contrast remains readable on mobile.
- The product still feels like GitHub Mobile + Linear Mobile + Jira Mobile, but simpler and mobile-first.
