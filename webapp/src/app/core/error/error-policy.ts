import {
  ApiErrorCodes,
  CoreErrorCodes,
  GlobalErrorCodes,
  type ErrorCode,
} from '@yinuo-ngm/errors';
import type { ErrorAction, ErrorLevel } from './error.types';

export const FRONTEND_ERROR_CODES = {
  CONNECTION_LOST: 990001,
  HTTP_ERROR: 990002,
  WS_ERROR: 990003,
  WS_CLOSED: 990004,
  INVALID_JSON: 990005,
  INVALID_MSG: 990006,
} as const;

export type FrontendErrorCode = (typeof FRONTEND_ERROR_CODES)[keyof typeof FRONTEND_ERROR_CODES];
export type ErrorPolicyCode = ErrorCode | FrontendErrorCode;

export type ErrorPolicyItem = {
  level: ErrorLevel;
  message?: string | ((ctx: any) => string);
  action?: ErrorAction;
};

export const ERROR_POLICY: Partial<Record<ErrorPolicyCode, ErrorPolicyItem>> = {
  [CoreErrorCodes.TASK_NOT_FOUND]: {
    level: 'silent',
  },
  [CoreErrorCodes.TASK_ALREADY_RUNNING]: {
    level: 'toast',
    message: '任务已在运行中',
  },
  [CoreErrorCodes.PROCESS_SPAWN_FAILED]: {
    level: 'toast',
    message: '任务启动失败',
  },
  [CoreErrorCodes.TASK_SPEC_NOT_FOUND]: {
    level: 'toast',
    message: '任务规格未找到',
  },
  [CoreErrorCodes.TASK_NOT_RUNNABLE]: {
    level: 'toast',
    message: '任务不可运行',
  },
  [CoreErrorCodes.RUN_NOT_FOUND]: {
    level: 'toast',
    message: '运行实例未找到',
  },
  [CoreErrorCodes.TASK_ID_REQUIRED]: {
    level: 'toast',
    message: '任务 ID 为必填项',
  },
  [CoreErrorCodes.COMMAND_NOT_FOUND]: {
    level: 'toast',
    message: '命令未找到，请确保已正确安装所需软件',
  },
  [CoreErrorCodes.PROJECT_NOT_FOUND]: {
    level: 'toast',
    message: '项目不存在',
  },
  [CoreErrorCodes.PROJECT_ROOT_INVALID]: {
    level: 'toast',
    message: '项目根目录无效',
  },
  [CoreErrorCodes.PROJECT_ALREADY_EXISTS]: {
    level: 'toast',
    message: '项目已存在',
  },
  [CoreErrorCodes.INVALID_NAME]: {
    level: 'toast',
    message: '无效的项目名称',
  },
  [CoreErrorCodes.TARGET_EXISTS]: {
    level: 'toast',
    message: '目标路径已存在',
  },
  [CoreErrorCodes.INVALID_REPO_URL]: {
    level: 'toast',
    message: '无效的仓库地址',
  },
  [CoreErrorCodes.GIT_CHECKOUT_FAILED]: {
    level: 'toast',
    message: 'Git 检出失败',
  },
  [CoreErrorCodes.BOOTSTRAP_NOT_IN_PICK_STATE]: {
    level: 'toast',
    message: '当前不处于选择根目录状态',
  },
  [CoreErrorCodes.BOOTSTRAP_CTX_NOT_FOUND]: {
    level: 'toast',
    message: '引导上下文未找到',
  },
  [CoreErrorCodes.BOOTSTRAP_INVALID_PICKED_ROOT]: {
    level: 'toast',
    message: '选择的根目录无效',
  },
  [CoreErrorCodes.BOOTSTRAP_NOT_WAITING_PICK]: {
    level: 'toast',
    message: '引导未处于等待选择状态',
  },
  [CoreErrorCodes.PROJECT_ANGULAR_JSON_INVALID]: {
    level: 'toast',
    message: 'angular.json 无效',
  },
  [CoreErrorCodes.PROJECT_ANGULAR_JSON_NOT_FOUND]: {
    level: 'toast',
    message: 'angular.json 未找到',
  },
  [CoreErrorCodes.PROJECT_VITE_CONFIG_INVALID]: {
    level: 'toast',
    message: 'vite 配置无效',
  },
  [CoreErrorCodes.PROJECT_VUE_CONFIG_NOT_FOUND]: {
    level: 'toast',
    message: 'vite 配置未找到',
  },
  [CoreErrorCodes.CONFIG_BACKUP_NOT_FOUND]: {
    level: 'toast',
    message: '配置备份未找到',
  },
  [CoreErrorCodes.CONFIG_READ_FAILED]: {
    level: 'toast',
    message: '配置读取失败，文件可能已损坏',
  },
  [CoreErrorCodes.CONFIG_CONFLICT]: {
    level: 'toast',
    message: '配置已被其他地方修改，请刷新重试',
  },
  [GlobalErrorCodes.FS_ALREADY_EXISTS]: {
    level: 'toast',
    message: '文件或文件夹已存在',
  },
  [GlobalErrorCodes.FS_PATH_NOT_FOUND]: {
    level: 'toast',
    message: '文件或文件夹未找到',
  },
  [GlobalErrorCodes.FS_PERMISSION_DENIED]: {
    level: 'toast',
    message: '文件系统权限被拒绝',
  },
  [CoreErrorCodes.FS_EXISTS_FAILED]: {
    level: 'toast',
    message: '检查路径是否存在时出错',
  },
  [GlobalErrorCodes.FS_INVALID_NAME]: {
    level: 'toast',
    message: '无效的文件或文件夹名称',
  },
  [GlobalErrorCodes.FS_MKDIR_FAILED]: {
    level: 'toast',
    message: '创建文件夹失败',
  },
  [GlobalErrorCodes.INTERNAL_ERROR]: {
    level: 'toast',
    message: '系统异常，请稍后重试',
  },
  [FRONTEND_ERROR_CODES.CONNECTION_LOST]: {
    level: 'banner',
    message: '与本地服务的连接已断开',
    action: { retry: true },
  },
  [FRONTEND_ERROR_CODES.HTTP_ERROR]: {
    level: 'toast',
    message: '网络请求失败，请检查您的网络连接',
  },
  [GlobalErrorCodes.UNAUTHORIZED]: {
    level: 'banner',
    message: '未授权访问，请重新登录',
    action: { reload: true },
  },
  [GlobalErrorCodes.UNKNOWN_ERROR]: {
    level: 'toast',
    message: '发生未知错误，请稍后重试',
  },
  [FRONTEND_ERROR_CODES.WS_ERROR]: {
    level: 'banner',
    message: 'WebSocket 连接异常',
    action: { retry: true },
  },
  [FRONTEND_ERROR_CODES.WS_CLOSED]: {
    level: 'banner',
    message: 'WebSocket 连接已关闭',
    action: { retry: true },
  },
  [GlobalErrorCodes.BAD_JSON]: {
    level: 'toast',
    message: '收到无效的 JSON 数据',
  },
  [GlobalErrorCodes.BAD_MSG]: {
    level: 'toast',
    message: '收到无效的消息格式',
  },
  [GlobalErrorCodes.OP_NOT_SUPPORTED]: {
    level: 'toast',
    message: '操作不被支持',
  },
  [GlobalErrorCodes.HANDLER_FAILED]: {
    level: 'toast',
    message: '消息处理失败',
  },
  [GlobalErrorCodes.TOPIC_NOT_FOUND]: {
    level: 'toast',
    message: '未知的消息主题',
  },
  [GlobalErrorCodes.OP_NOT_FOUND]: {
    level: 'toast',
    message: '未知的操作类型',
  },
  [CoreErrorCodes.DEP_INSTALL_FAILED]: {
    level: 'toast',
    message: '依赖安装失败',
  },
  [CoreErrorCodes.DEP_UNINSTALL_FAILED]: {
    level: 'toast',
    message: '依赖卸载失败',
  },
  [CoreErrorCodes.DEP_NOT_FOUND]: {
    level: 'toast',
    message: '依赖未找到',
  },
  [CoreErrorCodes.DASHBOARD_CONFLICT]: {
    level: 'toast',
    message: '仪表盘已被其他地方修改，请刷新重试',
  },
  [CoreErrorCodes.WIDGET_NOT_FOUND]: {
    level: 'toast',
    message: '部件未找到',
  },
  [CoreErrorCodes.WIDGET_LOCKED]: {
    level: 'toast',
    message: '部件被锁定，无法修改',
  },
  [CoreErrorCodes.RSS_FETCH_FAILED]: {
    level: 'toast',
    message: 'RSS 源获取失败',
  },
  [CoreErrorCodes.INVALID_RSS_URL]: {
    level: 'toast',
    message: '无效的 RSS 源地址',
  },
  [CoreErrorCodes.KILL_PORT_FAILED]: {
    level: 'toast',
    message: '端口释放失败',
  },
  [CoreErrorCodes.INVALID_PORT]: {
    level: 'toast',
    message: '无效的端口号',
  },
  [ApiErrorCodes.API_COLLECTION_NOT_EMPTY]: {
    level: 'toast',
    message: '集合不为空，无法删除',
  },
  [FRONTEND_ERROR_CODES.INVALID_JSON]: {
    level: 'dev-only',
  },
  [FRONTEND_ERROR_CODES.INVALID_MSG]: {
    level: 'dev-only',
  },
};

const LEGACY_ERROR_CODE_MAP: Record<string, ErrorPolicyCode> = {
  TASK_NOT_FOUND: CoreErrorCodes.TASK_NOT_FOUND,
  TASK_ALREADY_RUNNING: CoreErrorCodes.TASK_ALREADY_RUNNING,
  PROCESS_SPAWN_FAILED: CoreErrorCodes.PROCESS_SPAWN_FAILED,
  TASK_SPEC_NOT_FOUND: CoreErrorCodes.TASK_SPEC_NOT_FOUND,
  TASK_NOT_RUNNABLE: CoreErrorCodes.TASK_NOT_RUNNABLE,
  RUN_NOT_FOUND: CoreErrorCodes.RUN_NOT_FOUND,
  TASK_ID_REQUIRED: CoreErrorCodes.TASK_ID_REQUIRED,
  COMMAND_NOT_FOUND: CoreErrorCodes.COMMAND_NOT_FOUND,
  PROJECT_NOT_FOUND: CoreErrorCodes.PROJECT_NOT_FOUND,
  PROJECT_ROOT_INVALID: CoreErrorCodes.PROJECT_ROOT_INVALID,
  PROJECT_ALREADY_EXISTS: CoreErrorCodes.PROJECT_ALREADY_EXISTS,
  INVALID_NAME: CoreErrorCodes.INVALID_NAME,
  TARGET_EXISTS: CoreErrorCodes.TARGET_EXISTS,
  INVALID_REPO_URL: CoreErrorCodes.INVALID_REPO_URL,
  GIT_CHECKOUT_FAILED: CoreErrorCodes.GIT_CHECKOUT_FAILED,
  BOOTSTRAP_NOT_IN_PICK_STATE: CoreErrorCodes.BOOTSTRAP_NOT_IN_PICK_STATE,
  BOOTSTRAP_CTX_NOT_FOUND: CoreErrorCodes.BOOTSTRAP_CTX_NOT_FOUND,
  BOOTSTRAP_INVALID_PICKED_ROOT: CoreErrorCodes.BOOTSTRAP_INVALID_PICKED_ROOT,
  BOOTSTRAP_NOT_WAITING_PICK: CoreErrorCodes.BOOTSTRAP_NOT_WAITING_PICK,
  PROJECT_ANGULAR_JSON_INVALID: CoreErrorCodes.PROJECT_ANGULAR_JSON_INVALID,
  PROJECT_ANGULAR_JSON_NOT_FOUND: CoreErrorCodes.PROJECT_ANGULAR_JSON_NOT_FOUND,
  PROJECT_VITE_CONFIG_INVALID: CoreErrorCodes.PROJECT_VITE_CONFIG_INVALID,
  PROJECT_VUE_CONFIG_NOT_FOUND: CoreErrorCodes.PROJECT_VUE_CONFIG_NOT_FOUND,
  CONFIG_BACKUP_NOT_FOUND: CoreErrorCodes.CONFIG_BACKUP_NOT_FOUND,
  CONFIG_READ_FAILED: CoreErrorCodes.CONFIG_READ_FAILED,
  CONFIG_CONFLICT: CoreErrorCodes.CONFIG_CONFLICT,
  FS_ALREADY_EXISTS: GlobalErrorCodes.FS_ALREADY_EXISTS,
  FS_PATH_NOT_FOUND: GlobalErrorCodes.FS_PATH_NOT_FOUND,
  FS_PERMISSION_DENIED: GlobalErrorCodes.FS_PERMISSION_DENIED,
  FS_EXISTS_FAILED: CoreErrorCodes.FS_EXISTS_FAILED,
  FS_INVALID_NAME: GlobalErrorCodes.FS_INVALID_NAME,
  FS_MKDIR_FAILED: GlobalErrorCodes.FS_MKDIR_FAILED,
  INTERNAL_ERROR: GlobalErrorCodes.INTERNAL_ERROR,
  CONNECTION_LOST: FRONTEND_ERROR_CODES.CONNECTION_LOST,
  HTTP_ERROR: FRONTEND_ERROR_CODES.HTTP_ERROR,
  UNAUTHORIZED: GlobalErrorCodes.UNAUTHORIZED,
  UNKNOWN_ERROR: GlobalErrorCodes.UNKNOWN_ERROR,
  WS_ERROR: FRONTEND_ERROR_CODES.WS_ERROR,
  WS_CLOSED: FRONTEND_ERROR_CODES.WS_CLOSED,
  BAD_JSON: GlobalErrorCodes.BAD_JSON,
  BAD_MSG: GlobalErrorCodes.BAD_MSG,
  OP_NOT_SUPPORTED: GlobalErrorCodes.OP_NOT_SUPPORTED,
  HANDLER_FAILED: GlobalErrorCodes.HANDLER_FAILED,
  TOPIC_NOT_FOUND: GlobalErrorCodes.TOPIC_NOT_FOUND,
  OP_NOT_FOUND: GlobalErrorCodes.OP_NOT_FOUND,
  DEP_INSTALL_FAILED: CoreErrorCodes.DEP_INSTALL_FAILED,
  DEP_UNINSTALL_FAILED: CoreErrorCodes.DEP_UNINSTALL_FAILED,
  DEP_NOT_FOUND: CoreErrorCodes.DEP_NOT_FOUND,
  DASHBOARD_CONFLICT: CoreErrorCodes.DASHBOARD_CONFLICT,
  WIDGET_NOT_FOUND: CoreErrorCodes.WIDGET_NOT_FOUND,
  WIDGET_LOCKED: CoreErrorCodes.WIDGET_LOCKED,
  KILL_PORT_FAILED: CoreErrorCodes.KILL_PORT_FAILED,
  INVALID_PORT: CoreErrorCodes.INVALID_PORT,
  RSS_FETCH_FAILED: CoreErrorCodes.RSS_FETCH_FAILED,
  INVALID_RSS_URL: CoreErrorCodes.INVALID_RSS_URL,
  COLLECTION_NOT_EMPTY: ApiErrorCodes.API_COLLECTION_NOT_EMPTY,
  INVALID_JSON: FRONTEND_ERROR_CODES.INVALID_JSON,
  INVALID_MSG: FRONTEND_ERROR_CODES.INVALID_MSG,
};

export function coerceErrorPolicyCode(input: unknown): ErrorPolicyCode | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input as ErrorPolicyCode;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number.parseInt(trimmed, 10) as ErrorPolicyCode;
    }
    return LEGACY_ERROR_CODE_MAP[trimmed];
  }
  return undefined;
}
