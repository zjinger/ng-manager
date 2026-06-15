# Mobile App 版本管理收口说明

## 目标

Mobile App 下载与版本管理统一收口到“版本表 + 门户设置”模型，避免旧的按平台配置、手工上传管理和发布记录派生逻辑继续扩散。

本说明用于约束后续 Hub V2 Mobile App 相关开发。

## 唯一数据源

Mobile App 版本管理以以下表为唯一主数据源：

- `mobile_app_versions`：保存项目、平台、版本号、构建号、状态、安装包 uploadId、包信息、changelog、发布渠道、最低系统版本、发布时间和下载计数。
- `mobile_app_release_logs`：保存 `create`、`update`、`publish`、`archive`、`delete`、`download` 等动作日志。
- `shared_config`：仅用于 `mobile-app.portal-settings` 门户设置 JSON，不再保存平台包配置。

旧 `mobile-app.download` 配置不再作为管理页或 public 下载页的数据源。

`mobile-app.portal-settings` 的读取和保存逻辑必须统一经过 `MobileAppPortalSettingsService`。Admin 端和 public 端不得各自重复实现 `shared_config` 查询、JSON 解析或 schema 校验逻辑。

## Admin API 收口

管理端只使用以下接口：

- `GET /api/admin/projects/:projectId/mobile-app/versions`
- `POST /api/admin/projects/:projectId/mobile-app/versions`
- `GET /api/admin/projects/:projectId/mobile-app/versions/:versionId`
- `PATCH /api/admin/projects/:projectId/mobile-app/versions/:versionId`
- `DELETE /api/admin/projects/:projectId/mobile-app/versions/:versionId`
- `POST /api/admin/projects/:projectId/mobile-app/versions/:versionId/publish`
- `POST /api/admin/projects/:projectId/mobile-app/versions/:versionId/archive`
- `GET /api/admin/projects/:projectId/mobile-app/release-logs`
- `GET /api/admin/projects/:projectId/mobile-app/stats`
- `GET /api/admin/projects/:projectId/mobile-app/portal-settings`
- `PUT /api/admin/projects/:projectId/mobile-app/portal-settings`

安装包上传统一先走现有上传接口：

- `POST /api/admin/uploads`

前端上传目标必须使用 `UPLOAD_TARGETS.mobileAppPackage`，版本创建或更新时只提交 `packageUploadId`。后端只信任 upload 实体中的原始文件名、大小和 checksum，并将 checksum 作为版本记录的 SHA256 校验值保存；不接收前端传入的包名、大小或 SHA。

版本表单必须暴露以下核心字段：

- 版本号
- 构建号
- 平台
- 发布状态
- 安装包
- SHA256 校验值
- 更新日志
- 发布渠道
- 最低系统版本

## 已移除旧入口

以下旧管理接口不再保留，不允许继续接入新页面：

- `GET /api/admin/projects/:projectId/mobile-app`
- `PUT /api/admin/projects/:projectId/mobile-app`
- `POST /api/admin/projects/:projectId/mobile-app/packages/:platform`
- `DELETE /api/admin/projects/:projectId/mobile-app/packages/:platform`

如果未来需要批量迁移旧配置数据，应新增一次性迁移脚本或 migration，不应恢复这些接口作为运行时兼容路径。

## Public 下载页

公开下载页 URL 形态保留：

- `GET /api/public/mobile-app/projects/:projectKey/download`
- `GET /api/public/mobile-app/projects/:projectKey/packages/:platform/download`

数据源规则：

- 下载页按项目读取 `portal-settings`，并读取版本表中的 `published` 版本。
- iOS 与 Android 独立生效，各平台取自身最新 `published` 版本。
- 若没有任何平台存在可用 `published` 版本，返回 `MOBILE_APP_DOWNLOAD_NOT_CONFIGURED`。
- 包下载按平台查找最新 `published` 版本，校验关联 upload 为 `mobile-apps/package` 且仍为 active，再流式返回文件。
- 成功命中文件后写入 `download` release log，并递增该版本 `downloadCount`。

## 权限与错误码

权限沿用项目权限：

- 读接口要求 `requireProjectAccess`
- 写接口要求 `requireProjectMaintainer`

相关错误码必须在服务端 `ERROR_CODES` 注册，并在前端集中映射：

- `MOBILE_APP_DOWNLOAD_NOT_CONFIGURED`
- `MOBILE_APP_DOWNLOAD_PACKAGE_NOT_FOUND`
- `MOBILE_APP_VERSION_NOT_FOUND`
- `MOBILE_APP_VERSION_CONFLICT`
- `MOBILE_APP_VERSION_PACKAGE_REQUIRED`
- `MOBILE_APP_VERSION_PACKAGE_INVALID`
- `MOBILE_APP_VERSION_PUBLISH_FAILED`
- `MOBILE_APP_PORTAL_SETTINGS_INVALID`

禁止在业务代码中使用字符串字面量错误码。
