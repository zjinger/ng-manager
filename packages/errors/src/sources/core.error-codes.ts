/**
 * core 错误码 (22XXX~29XXX, 3XXXX~12XXXX)
 *
 * Nginx 使用 21XXX（独立分段）
 * core 各领域从 22XXX 开始，确保不与 Nginx 重叠
 *
 * | 码值    | 常量名                           | 说明              | HTTP Status |
 * |---------|--------------------------------|-------------------|-------------|
 * |          【Project 22XXX】                             |
 * | 22001   | PROJECT_NOT_FOUND              | 项目不存在         | 404         |
 * | 22002   | PROJECT_ROOT_INVALID           | 项目根目录无效     | 400         |
 * | 22003   | PROJECT_ALREADY_EXISTS         | 项目已存在         | 409         |
 * | 22004   | PROJECT_ID_REQUIRED            | 项目 ID 必填       | 400         |
 * | 22101   | PROJECT_IMPORT_NOT_EXISTS      | 导入路径不存在     | 404         |
 * | 22102   | PROJECT_IMPORT_NOT_DIR         | 导入路径非目录     | 400         |
 * | 22103   | PROJECT_IMPORT_ALREADY_REGISTERED | 已导入过该项目   | 409         |
 * | 22104   | PROJECT_IMPORT_NOT_RECOGNIZED  | 无法识别为项目     | 422         |
 * | 22105   | PROJECT_IMPORT_SCAN_FAILED     | 项目扫描失败       | 500         |
 * | 22106   | BOOTSTRAP_NOT_IN_PICK_STATE   | 不处于选择状态     | 400         |
 * | 22107   | BOOTSTRAP_CTX_NOT_FOUND       | 引导上下文未找到   | 404         |
 * | 22108   | BOOTSTRAP_INVALID_PICKED_ROOT | 选择根目录无效     | 400         |
 * | 22109   | BOOTSTRAP_NOT_WAITING_PICK    | 引导未等待选择     | 400         |
 * | 22201   | INVALID_NAME                  | 无效名称           | 400         |
 * | 22202   | TARGET_EXISTS                 | 目标已存在         | 409         |
 * | 22203   | INVALID_REPO_URL              | 无效仓库地址       | 400         |
 * | 22204   | INVALID_PARENT_DIR            | 无效父目录         | 400         |
 * | 22205   | GIT_CHECKOUT_FAILED           | Git 检出失败       | 500         |
 * | 22301   | PROJECT_ANGULAR_JSON_INVALID  | angular.json 无效  | 400         |
 * | 22302   | PROJECT_ANGULAR_JSON_NOT_FOUND | angular.json 不存在 | 404         |
 * | 22303   | PROJECT_VITE_CONFIG_INVALID   | vite 配置无效      | 400         |
 * | 22304   | PROJECT_VUE_CONFIG_NOT_FOUND  | vue 配置不存在     | 404         |
 * | 22401   | ASSET_NOT_FOUND              | 资产不存在          | 404         |
 * | 22402   | ASSET_KIND_NOT_SUPPORTED     | 资产类型不支持      | 400         |
 * | 22403   | ASSET_URL_REQUIRED           | 资产 URL 必填      | 400         |
 * | 22404   | ASSET_LABEL_REQUIRED         | 资产标签必填        | 400         |
 * | 22405   | ASSET_URL_INVALID            | 资产 URL 无效       | 400         |
 * | 22406   | ASSET_MODE_INVALID           | 资产模式无效        | 400         |
 * |          【Task 32XXX】                                |
 * | 32001   | TASK_NOT_FOUND               | 任务不存在          | 404         |
 * | 32002   | RUN_NOT_FOUND                | 运行记录不存在      | 404         |
 * | 32003   | TASK_ID_REQUIRED             | 任务 ID 必填        | 400         |
 * | 32004   | TASK_ALREADY_RUNNING         | 任务已在运行        | 409         |
 * | 32005   | PROCESS_SPAWN_FAILED        | 进程启动失败        | 500         |
 * | 32006   | TASK_SPEC_NOT_FOUND          | 任务规格不存在      | 404         |
 * | 32007   | TASK_NOT_RUNNABLE            | 任务不可运行        | 400         |
 * | 32008   | COMMAND_NOT_FOUND            | 命令不存在          | 404         |
 * |          【Config 4XXXX】                             |
 * | 40001   | CONFIG_BACKUP_NOT_FOUND       | 配置备份不存在     | 404         |
 * | 40002   | CONFIG_READ_FAILED            | 配置读取失败        | 500         |
 * | 40003   | CONFIG_WRITE_FAILED           | 配置写入失败        | 500         |
 * | 40004   | CONFIG_CONFLICT              | 配置冲突            | 409         |
 * | 40005   | CONFIG_OPEN_FAILED            | 配置打开失败        | 500         |
 * | 40006   | CONFIG_SCHEMA_NOT_FOUND       | Schema 不存在      | 404         |
 * | 40007   | CONFIG_DOMAIN_NOT_FOUND       | Domain 不存在      | 404         |
 * | 40008   | CONFIG_DOC_NOT_FOUND          | Doc 不存在          | 404         |
 * |          【FS 5XXXX】                                 |
 * | 50001   | FS_EXISTS_FAILED             | 存在性检查失败      | 500         |
 * |          【Dashboard 6XXXX】                         |
 * | 60001   | DASHBOARD_CONFLICT           | 仪表盘冲突          | 409         |
 * | 60002   | WIDGET_NOT_FOUND            | 组件不存在          | 404         |
 * | 60003   | WIDGET_LOCKED               | 组件已锁定          | 423         |
 * |          【Sprite 7XXXX】                             |
 * | 70001   | SPRITE_CONFIG_NOT_FOUND     | 雪碧图配置不存在    | 404         |
 * | 70002   | SPRITE_GROUP_NOT_FOUND      | 图标组不存在        | 404         |
 * | 70003   | SPRITE_ICONS_ROOT_NOT_FOUND | 图标目录不存在      | 404         |
 * |          【SVN 8XXXX】                                |
 * | 80001   | SVN_SYNC_ALREADY_RUNNING    | SVN 同步已在运行    | 409         |
 * | 80002   | SVN_SYNC_FAILED             | SVN 同步失败        | 500         |
 * | 80003   | SVN_SOURCE_ID_REQUIRED      | SVN 源 ID 必填      | 400         |
 * |          【Deps 9XXXX】                              |
 * | 90001   | DEP_INSTALL_FAILED          | 依赖安装失败        | 500         |
 * | 90002   | DEP_UNINSTALL_FAILED        | 依赖卸载失败        | 500         |
 * | 90003   | DEP_NOT_FOUND               | 依赖不存在          | 404         |
 * |          【NodeVersion 10XXX】                        |
 * | 100001  | NO_VERSION_MANAGER          | 未找到版本管理器    | 503         |
 * | 100002  | SWITCH_VERSION_FAILED       | 版本切换失败        | 500         |
 * | 100003  | NO_AVAILABLE_VERSIONS       | 无可用版本         | 409         |
 * | 100004  | VERSION_REQUIRED             | 版本必填           | 400         |
 * | 100005  | PROJECT_PATH_REQUIRED        | 项目路径必填        | 400         |
 * |          【Editor 11XXXX】                           |
 * | 110001  | EDITOR_NOT_FOUND           | 编辑器不存在        | 404         |
 * | 110002  | EDITOR_LAUNCH_FAILED       | 编辑器启动失败      | 500         |
 * |          【RSS / Port Killer 12XXXX】                |
 * | 120001  | RSS_FETCH_FAILED           | RSS 获取失败        | 500         |
 * | 120002  | INVALID_RSS_URL            | RSS URL 无效        | 400         |
 * | 120003  | KILL_PORT_FAILED           | 端口终止失败        | 500         |
 * | 120004  | INVALID_PORT               | 端口无效            | 400         |
 */
export const CoreErrorCodes = {
  // Project 22XXX
  PROJECT_NOT_FOUND: 22001,
  PROJECT_ROOT_INVALID: 22002,
  PROJECT_ALREADY_EXISTS: 22003,
  PROJECT_ID_REQUIRED: 22004,
  PROJECT_IMPORT_NOT_EXISTS: 22101,
  PROJECT_IMPORT_NOT_DIR: 22102,
  PROJECT_IMPORT_ALREADY_REGISTERED: 22103,
  PROJECT_IMPORT_NOT_RECOGNIZED: 22104,
  PROJECT_IMPORT_SCAN_FAILED: 22105,
  BOOTSTRAP_NOT_IN_PICK_STATE: 22106,
  BOOTSTRAP_CTX_NOT_FOUND: 22107,
  BOOTSTRAP_INVALID_PICKED_ROOT: 22108,
  BOOTSTRAP_NOT_WAITING_PICK: 22109,
  INVALID_NAME: 22201,
  TARGET_EXISTS: 22202,
  INVALID_REPO_URL: 22203,
  INVALID_PARENT_DIR: 22204,
  GIT_CHECKOUT_FAILED: 22205,
  PROJECT_ANGULAR_JSON_INVALID: 22301,
  PROJECT_ANGULAR_JSON_NOT_FOUND: 22302,
  PROJECT_VITE_CONFIG_INVALID: 22303,
  PROJECT_VUE_CONFIG_NOT_FOUND: 22304,
  ASSET_NOT_FOUND: 22401,
  ASSET_KIND_NOT_SUPPORTED: 22402,
  ASSET_URL_REQUIRED: 22403,
  ASSET_LABEL_REQUIRED: 22404,
  ASSET_URL_INVALID: 22405,
  ASSET_MODE_INVALID: 22406,
  // Config 4XXXX
  CONFIG_BACKUP_NOT_FOUND: 40001,
  CONFIG_READ_FAILED: 40002,
  CONFIG_WRITE_FAILED: 40003,
  CONFIG_CONFLICT: 40004,
  CONFIG_OPEN_FAILED: 40005,
  CONFIG_SCHEMA_NOT_FOUND: 40006,
  CONFIG_DOMAIN_NOT_FOUND: 40007,
  CONFIG_DOC_NOT_FOUND: 40008,
  // Task 32XXX
  TASK_NOT_FOUND: 32001,
  RUN_NOT_FOUND: 32002,
  TASK_ID_REQUIRED: 32003,
  TASK_ALREADY_RUNNING: 32004,
  PROCESS_SPAWN_FAILED: 32005,
  TASK_SPEC_NOT_FOUND: 32006,
  TASK_NOT_RUNNABLE: 32007,
  COMMAND_NOT_FOUND: 32008,
  // FS 5XXXX
  FS_EXISTS_FAILED: 50001,
  // Dashboard 6XXXX
  DASHBOARD_CONFLICT: 60001,
  WIDGET_NOT_FOUND: 60002,
  WIDGET_LOCKED: 60003,
  // Sprite 7XXXX
  SPRITE_CONFIG_NOT_FOUND: 70001,
  SPRITE_GROUP_NOT_FOUND: 70002,
  SPRITE_ICONS_ROOT_NOT_FOUND: 70003,
  // SVN 8XXXX
  SVN_SYNC_ALREADY_RUNNING: 80001,
  SVN_SYNC_FAILED: 80002,
  SVN_SOURCE_ID_REQUIRED: 80003,
  // Deps 9XXXX
  DEP_INSTALL_FAILED: 90001,
  DEP_UNINSTALL_FAILED: 90002,
  DEP_NOT_FOUND: 90003,
  // NodeVersion 10XXX
  NO_VERSION_MANAGER: 100001,
  SWITCH_VERSION_FAILED: 100002,
  NO_AVAILABLE_VERSIONS: 100003,
  VERSION_REQUIRED: 100004,
  PROJECT_PATH_REQUIRED: 100005,
  // Editor 11XXXX
  EDITOR_NOT_FOUND: 110001,
  EDITOR_LAUNCH_FAILED: 110002,
  // RSS / Port Killer 12XXXX
  RSS_FETCH_FAILED: 120001,
  INVALID_RSS_URL: 120002,
  KILL_PORT_FAILED: 120003,
  INVALID_PORT: 120004,
} as const;

export type CoreErrorCode = typeof CoreErrorCodes[keyof typeof CoreErrorCodes];
