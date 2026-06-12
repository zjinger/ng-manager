# Hub V2 App Android 打包与发布规范

本文档用于统一 Hub V2 App 团队内 Android 开发、测试、预览和内部分发正式包的操作方式。

## 适用范围

- 项目：`apps/hubv2-app`
- 平台：Android
- 分发方式：内部分发 APK
- 运行形态：Expo Development Build / Android Release APK
- 不适用范围：Expo Go、Google Play、iOS TestFlight、外部商店上架

## 基本原则

- 本项目使用 `react-native-mmkv` 3.x 和 React Native New Architecture，不能使用 Expo Go。
- 日常真机联调使用 Development Build。
- 内部分发正式包必须使用 release 签名，不能使用 debug keystore。
- release 包必须脱离 Metro 独立启动。
- 环境变量文件可以提交到 Git 的前提是只包含 `EXPO_PUBLIC_*` 等非敏感配置。
- keystore、签名密码、Token、Cookie、私钥等敏感信息不能提交到 Git。

## 环境配置

环境文件统一放在：

```text
apps/hubv2-app/env/
```

当前约定文件：

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

字段说明：

- `EXPO_PUBLIC_APP_ENV`：运行环境，允许值为 `development`、`preview`、`production`。
- `EXPO_PUBLIC_APP_NAME`：App 显示名称。
- `EXPO_PUBLIC_API_URL`：Hub V2 API Base URL，必须包含 `/api` 前缀。

Expo 默认只自动读取项目根目录 `.env` 文件。本项目通过 `scripts/with-env.mjs` 主动加载 `env/.env.<name>`，因此启动和打包应优先使用 `package.json` 中封装好的 npm scripts。

## 常用开发命令

进入项目目录：

```bash
cd apps/hubv2-app
```

安装依赖：

```bash
npm install
```

生成并安装 development build：

```bash
npm run android
```

启动开发环境 Metro：

```bash
npm run start:dev
```

启动测试环境 Metro：

```bash
npm run start:preview
```

使用测试环境安装 development build：

```bash
npm run android:preview
```

说明：

- `start` 当前是普通 Expo Metro 启动入口。
- `start:dev` 明确使用 `expo start --dev-client`，日常真机联调优先使用它。
- 如果需要清理 Metro 缓存，使用 `npm run start:clean`。

## Android Release 签名

release keystore 必须保存在仓库外，例如：

```powershell
New-Item -ItemType Directory -Force C:\Users\<user>\.keystores
keytool -genkeypair `
  -v `
  -storetype PKCS12 `
  -keystore C:\Users\<user>\.keystores\hubv2-release.keystore `
  -alias hubv2-release `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

请妥善保存 keystore 和密码。丢失 keystore 后，相同 Android 包名的后续升级包将无法覆盖安装。

本机签名参数可写入：

```text
apps/hubv2-app/android/local.properties
```

示例：

```properties
HUBV2_UPLOAD_STORE_FILE=C:\\Users\\<user>\\.keystores\\hubv2-release.keystore
HUBV2_UPLOAD_KEY_ALIAS=hubv2-release
HUBV2_UPLOAD_STORE_PASSWORD=<store-password>
HUBV2_UPLOAD_KEY_PASSWORD=<key-password>
```

也可以使用同名环境变量替代 `android/local.properties`。

禁止提交：

- `*.keystore`
- `*.jks`
- `android/local.properties`
- 签名密码
- 任意 Token、Cookie、私钥

## Release 打包命令

生产正式包：

```bash
npm run android:release
```

生产发布默认会建议下一个 patch 版本和下一个 `versionCode`，并在构建前要求输入 `y` 确认。确认后，脚本会在构建成功后把新 `versionName` 写回 `package.json` 和 `package-lock.json`。

CI 或自动化场景可跳过交互确认：

```bash
npm run android:release:production -- --yes
```

测试环境正式包：

```bash
npm run android:release:preview
```

临时覆盖 API 地址：

```bash
npm run android:release -- --api-url http://host:port/api
```

临时覆盖版本：

```bash
npm run android:release -- --version-name 1.0.1 --version-code 2
```

选择版本递增类型：

```bash
npm run android:release:production -- --bump minor
```

允许值：

- `patch`：补丁版本递增，生产发布默认值。
- `minor`：次版本递增。
- `major`：主版本递增。
- `none`：不递增 `versionName`，但仍会自动递增 `versionCode`。

也可以使用：

```bash
npm run android:release -- --no-version-bump
```

脚本会执行：

```text
npm run type-check
npm run lint
android/gradlew assembleRelease
```

## 版本号规范

Android 版本包含两个字段：

- `versionName`：用户可见版本号，例如 `1.0.1`。
- `versionCode`：Android 升级判断使用的整数，后续发包必须递增。

建议规则：

- 每次内部分发 APK，如果需要覆盖安装到同一设备，`versionCode` 必须递增。
- 修复类版本递增补丁号，例如 `1.0.0 -> 1.0.1`。
- 新功能版本递增次版本号，例如 `1.0.1 -> 1.1.0`。
- 不要复用已经分发过的 `versionName + versionCode` 组合。
- `production` release 默认递增 `versionName` 的 patch 位。
- `preview` release 默认不递增 `versionName`，只递增 `versionCode`。

## APK 命名与发布记录

release 脚本会把 Gradle 默认产物重命名为：

```text
HubV2-v<versionName>+<versionCode>-<env>.apk
```

产物目录：

```text
releases/android/<versionName>+<versionCode>/
```

目录内容：

- `HubV2-v<versionName>+<versionCode>-<env>.apk`
- `release.json`
- `RELEASE.md`

`release.json` 记录：

- App 名称
- 平台
- 环境
- API URL
- Application ID
- APK 文件名
- APK size
- SHA-256
- 构建时间
- Git commit
- Git dirty 状态
- type-check / lint / assembleRelease 结果

APK 文件已被 `.gitignore` 忽略。`release.json` 和 `RELEASE.md` 可用于团队发布追踪。

## 真机安装

安装最新 release APK：

```bash
npm run android:release:install
```

安装指定 APK：

```bash
npm run android:release:install -- --apk releases/android/1.0.1+2/HubV2-v1.0.1+2-prod.apk
```

也可以使用 ADB：

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## 发布前质量门禁

发布前必须通过：

```bash
npm run type-check
npm run lint
npm run android:release
```

如果改动涉及发布环境、签名、版本号、APK 命名或 Android 原生配置，必须重新打 release 包并在 Android 真机安装验证。

## 真机验收清单

正式包安装后关闭 Metro，再打开 App 验证。

必须验收：

- App 可脱离 Metro 启动。
- 登录、登录态恢复、退出登录。
- 工作台首页数据加载。
- 服务器配置和连接测试。
- 正式包 API 指向预期环境。
- APK 可覆盖安装旧版本。
- App 内显示版本号与发布记录一致。

## 常见问题

### Expo Go 无法运行

本项目包含 `react-native-mmkv` 3.x，需要 New Architecture 和项目原生模块。Expo Go 不包含这些原生模块，因此不能作为本项目运行方式。

### MMKV 报 TurboModules / New Architecture 错误

确认 `app.config.ts` 中启用了：

```ts
newArchEnabled: true
```

修改 native 相关配置后，需要重新安装 development build 或重新打 release 包。

### Android release 使用 HTTP 接口

当前内部分发允许内网 HTTP。后续外部分发或上架应用商店时，应切换 HTTPS，并关闭 Android cleartext traffic。

## 维护约定

- 新增环境时，需要补充 `env/.env.<name>`，并同步 `scripts/with-env.mjs` 或 npm scripts。
- 新增打包命令时，需要同步本文档和 `README.md`。
- 修改签名、版本、APK 命名或发布记录格式时，必须同步本文档。
- 任何涉及敏感信息的配置不得写入本文档示例中的真实值。
