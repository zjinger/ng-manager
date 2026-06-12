# Hub V2 Mobile App

Hub V2 Mobile 是 Hub V2 的研发协作随身端，覆盖工作台、统一待办、待办详情、消息中心、消息详情、我的、服务器配置与项目切换等移动端主流程。

## 运行方式

本项目使用 Expo Development Build，不使用 Expo Go。

`react-native-mmkv` 3.x 依赖 React Native New Architecture，`app.config.ts` 已启用 `newArchEnabled: true`。如果用 Expo Go 打开，会因为 Expo Go 不包含项目原生模块而启动失败。

常用命令：

```bash
npm install
npm run android
npm run start:dev
npm run type-check
npm run lint
```

说明：

- `npm run android` 会生成并安装本项目的 Android development build。
- `npm run start:dev` 启动 Metro，供 development build 连接。
- `npm run start` 仍保留为 Expo 默认命令，但联调 MMKV/native module 时应优先使用 development build。

## API 配置

默认 API 地址来自环境变量：

```bash
EXPO_PUBLIC_API_URL=http://host:port/api
```

App 内也可以在 `我的 -> 服务器配置` Bottom Sheet 中修改 API Base URL，并通过 `/admin/mobile/connection` 测试连接。业务接口路径以 `/admin/...` 为准，最终请求会拼接到 `baseURL` 后。

移动端使用 Hub V2 Cookie Session 登录态：

- 生产 App 用户鉴权不使用 Personal Token。
- Project Token 只作为只读集成或调试边界，不作为移动端用户登录方式。
- 登录接口沿用 `/admin/auth/login/challenge`、`/admin/auth/login`、`/admin/auth/me`、`/admin/auth/logout`。

## 已实现范围

- 登录与登录态恢复。
- 工作台 Dashboard，包括待办统计、研发项进度、公告、快捷入口。
- 项目切换 Bottom Sheet。
- 统一待办列表，支持分类、项目、状态、优先级、关键字与分页。
- 待办详情，支持 Issue 评论、Issue 操作、RD 进度、RD 操作。
- 消息中心与消息详情，支持分类、未读筛选、分页和已读。
- 我的页面、退出登录、服务器配置 Bottom Sheet 和连接测试。
- Light/Dark 主题语义 token，页面避免直接依赖设计稿深色硬编码。

## 联调验收清单

建议按以下顺序验证：

1. `npm run type-check`
2. `npm run lint`
3. `npm run android`
4. 使用 development build 登录 Hub V2。
5. 验证工作台数据、项目切换、待办筛选、待办详情评论/状态操作、消息详情、服务器配置连接测试。
6. 在浅色与深色主题下检查 02-08 设计页对应主流程是否可读、可点、无布局遮挡。

## 当前边界

- 尚未补充自动化端到端测试，Phase 8 以手工联调和静态校验为主。
- Android 构建日志中的 hard link fallback、Gradle deprecated features、debug manifest replace warning 当前不影响构建成功。
- 消息列表依赖服务端 mobile 聚合接口的通知来源，公告/文档/发布详情可由详情接口按类型聚合。
