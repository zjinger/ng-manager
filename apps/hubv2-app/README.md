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
npm run android:release
npm run type-check
npm run lint
```

说明：

- `npm run android` 会生成并安装本项目的 Android development build。
- `npm run start:dev` 启动 Metro，供 development build 连接。
- `npm run android:release` 会构建 Android release APK，不依赖 Metro。
- `npm run start:preview` / `npm run android:preview` 可使用测试环境配置。

## API 配置

环境文件统一放在 `env/` 目录下：

```text
env/.env.development
env/.env.preview
env/.env.production
```

每个环境文件包含：

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_APP_NAME=Hub V2 Dev
EXPO_PUBLIC_API_URL=http://host:port/api
```

Expo 默认只会自动读取项目根目录的 `.env` 文件。本项目通过 `scripts/with-env.mjs` 在启动命令前主动加载 `env/.env.<name>`，因此环境文件可以集中放在 `env/` 目录内。

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

## Android 内部分发正式包

本项目的 Android 内部分发包走本地 Gradle release 构建，产物是可直接安装的 APK。正式包不使用 Expo Go，不依赖 `npm run start:dev` / Metro。

### 1. 生成 release keystore

keystore 必须放在仓库外，例如：

```powershell
New-Item -ItemType Directory -Force C:\Users\zjing\.keystores
keytool -genkeypair `
  -v `
  -storetype PKCS12 `
  -keystore C:\Users\zjing\.keystores\hubv2-release.keystore `
  -alias hubv2-release `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

请妥善保存 keystore 和密码。丢失 keystore 后，相同 Android 包名的后续升级包将无法覆盖安装。

### 2. 配置本机签名参数

在 `android/local.properties` 中加入以下配置。该文件已被 Android `.gitignore` 忽略，不应提交：

```properties
HUBV2_UPLOAD_STORE_FILE=C:\\Users\\zjing\\.keystores\\hubv2-release.keystore
HUBV2_UPLOAD_KEY_ALIAS=hubv2-release
HUBV2_UPLOAD_STORE_PASSWORD=<store-password>
HUBV2_UPLOAD_KEY_PASSWORD=<key-password>
```

也可以使用同名环境变量替代 `android/local.properties`。

### 3. 构建正式包

正式包使用跨平台 Node 脚本构建，Windows 和 macOS 使用同一条命令：

```bash
npm run android:release
```

生产发布默认会建议下一个 patch 版本和下一个 `versionCode`，并在构建前要求确认。需要用于 CI 或自动化时：

```bash
npm run android:release:production -- --yes
```

默认读取 `env/.env.production`。测试环境正式包可使用：

```bash
npm run android:release:preview
```

需要临时覆盖 API 地址时：

```bash
npm run android:release -- --api-url http://<内网服务地址>/api
```

脚本会执行 `type-check`、`lint`、`assembleRelease`，并把 Gradle 默认产物重命名为规范文件名：

```text
HubV2-v<versionName>+<versionCode>-<env>.apk
```

默认版本来自 `package.json` 和 Android Gradle 配置。需要临时指定版本时：

```bash
npm run android:release -- --version-name 1.0.1 --version-code 2
```

需要选择版本递增类型时：

```bash
npm run android:release:production -- --bump minor
```

当前 Android release 允许内网 HTTP 明文访问；后续如果要上架应用商店或外部分发，应切换到 HTTPS 并关闭 cleartext traffic。

### 4. 产物与发布记录

发布产物会写入：

```text
releases/android/<versionName>+<versionCode>/
```

目录内容：

- `HubV2-v<versionName>+<versionCode>-<env>.apk`
- `release.json`
- `RELEASE.md`

APK 已在 `.gitignore` 中忽略；`release.json` 和 `RELEASE.md` 可用于发布追踪。

真机安装：

```bash
npm run android:release:install
```

也可以指定 APK：

```bash
npm run android:release:install -- --apk releases/android/1.0.1+2/HubV2-v1.0.1+2-prod.apk
```

安装后请关闭 Metro，再打开 App 验证正式包可以独立启动。

## 当前边界

- 尚未补充自动化端到端测试，Phase 8 以手工联调和静态校验为主。
- Android 构建日志中的 hard link fallback、Gradle deprecated features、debug manifest replace warning 当前不影响构建成功。
- 消息列表依赖服务端 mobile 聚合接口的通知来源，公告/文档/发布详情可由详情接口按类型聚合。
- Android 内部分发 release 包暂时允许内网 HTTP；外部分发前需要切换 HTTPS。
