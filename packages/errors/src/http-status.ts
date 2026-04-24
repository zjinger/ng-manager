import { GlobalErrorCodes } from './sources/global.error-codes';
import { CoreErrorCodes } from './sources/core.error-codes';
import { NginxErrorCodes } from './sources/nginx.error-codes';
import { ApiErrorCodes } from './sources/api.error-codes';
import { AisErrorCodes } from './sources/ais.error-codes';
import { RuntimeErrorCodes } from './sources/runtime.error-codes';

export const httpStatusMap: Record<number, number> = {
  // 全局 1XXXX
  [GlobalErrorCodes.UNKNOWN_ERROR]: 500,
  [GlobalErrorCodes.INTERNAL_ERROR]: 500,
  [GlobalErrorCodes.BAD_REQUEST]: 400,
  [GlobalErrorCodes.NOT_FOUND]: 404,
  [GlobalErrorCodes.NOT_IMPLEMENTED]: 501,
  [GlobalErrorCodes.STORAGE_IO_ERROR]: 500,
  [GlobalErrorCodes.FS_PATH_NOT_FOUND]: 404,
  [GlobalErrorCodes.FS_PERMISSION_DENIED]: 403,
  [GlobalErrorCodes.FS_ALREADY_EXISTS]: 409,
  [GlobalErrorCodes.FS_INVALID_NAME]: 400,
  [GlobalErrorCodes.FS_MKDIR_FAILED]: 500,
  [GlobalErrorCodes.BAD_JSON]: 400,
  [GlobalErrorCodes.BAD_MSG]: 400,
  [GlobalErrorCodes.OP_NOT_SUPPORTED]: 400,
  [GlobalErrorCodes.TOPIC_NOT_FOUND]: 404,
  [GlobalErrorCodes.HANDLER_FAILED]: 500,
  [GlobalErrorCodes.OP_NOT_FOUND]: 400,
  [GlobalErrorCodes.UNAUTHORIZED]: 401,
  [GlobalErrorCodes.INVALID_TIMESTAMP]: 400,

  // Nginx 20XXX
  [NginxErrorCodes.NGINX_NOT_BOUND]: 400,
  [NginxErrorCodes.NGINX_ALREADY_RUNNING]: 409,
  [NginxErrorCodes.NGINX_NOT_RUNNING]: 400,
  [NginxErrorCodes.NGINX_START_FAILED]: 500,
  [NginxErrorCodes.NGINX_STOP_FAILED]: 500,
  [NginxErrorCodes.NGINX_RELOAD_FAILED]: 500,
  [NginxErrorCodes.NGINX_TEST_FAILED]: 400,
  [NginxErrorCodes.NGINX_CONFIG_READ_FAILED]: 500,
  [NginxErrorCodes.NGINX_CONFIG_WRITE_FAILED]: 500,
  [NginxErrorCodes.NGINX_CONFIG_INVALID]: 400,
  [NginxErrorCodes.NGINX_CONFIG_NOT_MANAGEABLE]: 403,
  [NginxErrorCodes.NGINX_SERVER_NOT_FOUND]: 404,
  [NginxErrorCodes.NGINX_SERVER_ALREADY_EXISTS]: 409,
  [NginxErrorCodes.NGINX_SERVER_PORT_CONFLICT]: 409,
  [NginxErrorCodes.NGINX_SERVER_NAME_CONFLICT]: 409,
  [NginxErrorCodes.NGINX_SERVER_FILE_INVALID]: 400,
  [NginxErrorCodes.NGINX_SERVER_DELETE_BLOCKED]: 409,
  [NginxErrorCodes.NGINX_SERVER_IMPORT_FAILED]: 400,
  [NginxErrorCodes.NGINX_SSL_CERT_NOT_FOUND]: 400,
  [NginxErrorCodes.NGINX_SSL_KEY_NOT_FOUND]: 400,
  [NginxErrorCodes.NGINX_SSL_CERT_INVALID]: 400,
  [NginxErrorCodes.NGINX_UPSTREAM_NOT_FOUND]: 404,
  [NginxErrorCodes.NGINX_UPSTREAM_ALREADY_EXISTS]: 409,
  [NginxErrorCodes.NGINX_UPSTREAM_NODE_INVALID]: 400,

  // Core - Project 2XXXX
  [CoreErrorCodes.PROJECT_NOT_FOUND]: 404,
  [CoreErrorCodes.PROJECT_ROOT_INVALID]: 400,
  [CoreErrorCodes.PROJECT_ALREADY_EXISTS]: 409,
  [CoreErrorCodes.PROJECT_ID_REQUIRED]: 400,
  [CoreErrorCodes.PROJECT_IMPORT_NOT_EXISTS]: 404,
  [CoreErrorCodes.PROJECT_IMPORT_NOT_DIR]: 400,
  [CoreErrorCodes.PROJECT_IMPORT_ALREADY_REGISTERED]: 409,
  [CoreErrorCodes.PROJECT_IMPORT_NOT_RECOGNIZED]: 422,
  [CoreErrorCodes.PROJECT_IMPORT_SCAN_FAILED]: 500,
  [CoreErrorCodes.BOOTSTRAP_NOT_IN_PICK_STATE]: 400,
  [CoreErrorCodes.BOOTSTRAP_CTX_NOT_FOUND]: 404,
  [CoreErrorCodes.BOOTSTRAP_INVALID_PICKED_ROOT]: 400,
  [CoreErrorCodes.BOOTSTRAP_NOT_WAITING_PICK]: 400,
  [CoreErrorCodes.INVALID_NAME]: 400,
  [CoreErrorCodes.TARGET_EXISTS]: 409,
  [CoreErrorCodes.INVALID_REPO_URL]: 400,
  [CoreErrorCodes.INVALID_PARENT_DIR]: 400,
  [CoreErrorCodes.GIT_CHECKOUT_FAILED]: 500,
  [CoreErrorCodes.PROJECT_ANGULAR_JSON_INVALID]: 400,
  [CoreErrorCodes.PROJECT_ANGULAR_JSON_NOT_FOUND]: 404,
  [CoreErrorCodes.PROJECT_VITE_CONFIG_INVALID]: 400,
  [CoreErrorCodes.PROJECT_VUE_CONFIG_NOT_FOUND]: 404,
  [CoreErrorCodes.ASSET_NOT_FOUND]: 404,
  [CoreErrorCodes.ASSET_KIND_NOT_SUPPORTED]: 400,
  [CoreErrorCodes.ASSET_URL_REQUIRED]: 400,
  [CoreErrorCodes.ASSET_LABEL_REQUIRED]: 400,
  [CoreErrorCodes.ASSET_URL_INVALID]: 400,
  [CoreErrorCodes.ASSET_MODE_INVALID]: 400,

  // Core - Task 3XXXX
  [CoreErrorCodes.TASK_NOT_FOUND]: 404,
  [CoreErrorCodes.RUN_NOT_FOUND]: 404,
  [CoreErrorCodes.TASK_ID_REQUIRED]: 400,
  [CoreErrorCodes.TASK_ALREADY_RUNNING]: 409,
  [CoreErrorCodes.PROCESS_SPAWN_FAILED]: 500,
  [CoreErrorCodes.TASK_SPEC_NOT_FOUND]: 404,
  [CoreErrorCodes.TASK_NOT_RUNNABLE]: 400,
  [CoreErrorCodes.COMMAND_NOT_FOUND]: 404,

  // Core - Config 4XXXX
  [CoreErrorCodes.CONFIG_BACKUP_NOT_FOUND]: 404,
  [CoreErrorCodes.CONFIG_READ_FAILED]: 500,
  [CoreErrorCodes.CONFIG_WRITE_FAILED]: 500,
  [CoreErrorCodes.CONFIG_CONFLICT]: 409,
  [CoreErrorCodes.CONFIG_OPEN_FAILED]: 500,
  [CoreErrorCodes.CONFIG_SCHEMA_NOT_FOUND]: 404,
  [CoreErrorCodes.CONFIG_DOMAIN_NOT_FOUND]: 404,
  [CoreErrorCodes.CONFIG_DOC_NOT_FOUND]: 404,

  // Core - FS 5XXXX
  [CoreErrorCodes.FS_EXISTS_FAILED]: 500,

  // Core - Dashboard 6XXXX
  [CoreErrorCodes.DASHBOARD_CONFLICT]: 409,
  [CoreErrorCodes.WIDGET_NOT_FOUND]: 404,
  [CoreErrorCodes.WIDGET_LOCKED]: 423,

  // Core - Sprite 7XXXX
  [CoreErrorCodes.SPRITE_CONFIG_NOT_FOUND]: 404,
  [CoreErrorCodes.SPRITE_GROUP_NOT_FOUND]: 404,
  [CoreErrorCodes.SPRITE_ICONS_ROOT_NOT_FOUND]: 404,

  // Core - SVN 8XXXX
  [CoreErrorCodes.SVN_SYNC_ALREADY_RUNNING]: 409,
  [CoreErrorCodes.SVN_SYNC_FAILED]: 500,
  [CoreErrorCodes.SVN_SOURCE_ID_REQUIRED]: 400,

  // Core - Deps 9XXXX
  [CoreErrorCodes.DEP_INSTALL_FAILED]: 500,
  [CoreErrorCodes.DEP_UNINSTALL_FAILED]: 500,
  [CoreErrorCodes.DEP_NOT_FOUND]: 404,

  // Core - NodeVersion 10XXXX
  [CoreErrorCodes.NO_VERSION_MANAGER]: 503,
  [CoreErrorCodes.SWITCH_VERSION_FAILED]: 500,
  [CoreErrorCodes.NO_AVAILABLE_VERSIONS]: 409,
  [CoreErrorCodes.VERSION_REQUIRED]: 400,
  [CoreErrorCodes.PROJECT_PATH_REQUIRED]: 400,

  // Core - Editor 11XXXX
  [CoreErrorCodes.EDITOR_NOT_FOUND]: 404,
  [CoreErrorCodes.EDITOR_LAUNCH_FAILED]: 500,

  // Core - RSS/Port 12XXXX
  [CoreErrorCodes.RSS_FETCH_FAILED]: 500,
  [CoreErrorCodes.INVALID_RSS_URL]: 400,
  [CoreErrorCodes.KILL_PORT_FAILED]: 500,
  [CoreErrorCodes.INVALID_PORT]: 400,

  // API 21XXX
  [ApiErrorCodes.API_REQUEST_NOT_FOUND]: 404,
  [ApiErrorCodes.API_REQUEST_SAVE_FAILED]: 500,
  [ApiErrorCodes.API_COLLECTION_NOT_FOUND]: 404,
  [ApiErrorCodes.API_COLLECTION_ALREADY_EXISTS]: 409,
  [ApiErrorCodes.API_ENV_NOT_FOUND]: 404,
  [ApiErrorCodes.API_SEND_FAILED]: 500,
  [ApiErrorCodes.API_TIMEOUT]: 504,
  [ApiErrorCodes.API_INVALID_URL]: 400,
  [ApiErrorCodes.API_HUB_TOKEN_INVALID]: 401,
  [ApiErrorCodes.API_HUB_TOKEN_REQUIRED]: 400,
  [ApiErrorCodes.API_HISTORY_NOT_FOUND]: 404,

  // AIS 22XXX
  [AisErrorCodes.AIS_BIT_BUFFER_OVERFLOW]: 400,
  [AisErrorCodes.AIS_BIT_BUFFER_UNDERFLOW]: 400,
  [AisErrorCodes.AIS_INVALID_SIXBIT_CHAR]: 400,
  [AisErrorCodes.AIS_ENCODE_FAILED]: 500,
  [AisErrorCodes.AIS_DECODE_FAILED]: 500,
  [AisErrorCodes.AIS_TEXT_ENCODE_FAILED]: 500,
  [AisErrorCodes.AIS_TEXT_DECODE_FAILED]: 500,
  [AisErrorCodes.AIS_INVALID_LATLNG]: 400,
  [AisErrorCodes.AIS_INVALID_NMEA_SENTENCE]: 400,
  [AisErrorCodes.AIS_TRANSPORT_INVALID]: 400,
  [AisErrorCodes.AIS_SCHEMA_ENCODE_FAILED]: 500,
  [AisErrorCodes.AIS_FIELD_CONSTRAINT_VIOLATED]: 400,
  [AisErrorCodes.AIS_CHANNEL_REQUIRED]: 400,
  [AisErrorCodes.AIS_CHANNEL_INVALID]: 400,
  [AisErrorCodes.AIS_MSG_TYPE_NOT_SUPPORTED]: 400,
  [AisErrorCodes.AIS_DAC_INVALID]: 400,
  [AisErrorCodes.AIS_FI_INVALID]: 400,
  [AisErrorCodes.AIS_APP_DATA_TOO_LONG]: 400,

  // Runtime 30XXX
  [RuntimeErrorCodes.RUNTIME_LOCK_FAILED]: 500,
  [RuntimeErrorCodes.RUNTIME_SERVER_NOT_STARTED]: 500,
  [RuntimeErrorCodes.RUNTIME_HEALTH_CHECK_FAILED]: 500,
  [RuntimeErrorCodes.RUNTIME_SHUTDOWN_FAILED]: 500,
};

export function getHttpStatus(code: number): number {
  return httpStatusMap[code] ?? 500;
}
