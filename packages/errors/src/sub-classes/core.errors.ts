import { AppError } from '../app-error';
import { CoreErrorCodes } from '../sources/core.error-codes';

export class CoreError extends AppError<typeof CoreErrorCodes[keyof typeof CoreErrorCodes]> {
  public readonly source = '@yinuo-ngm/core';
}

export class SpriteError extends AppError<typeof CoreErrorCodes[keyof typeof CoreErrorCodes]> {
  public readonly source = '@yinuo-ngm/sprite';
}

export const coreErrors = {
  projectNotFound: (id: string) =>
    new CoreError(CoreErrorCodes.PROJECT_NOT_FOUND, `项目不存在: ${id}`, { projectId: id }),

  projectAlreadyExists: (name: string) =>
    new CoreError(CoreErrorCodes.PROJECT_ALREADY_EXISTS, `项目已存在: ${name}`, { name }),

  projectRootInvalid: (path: string, reason?: string) =>
    new CoreError(CoreErrorCodes.PROJECT_ROOT_INVALID, reason ? `项目根目录无效: ${reason}` : '项目根目录无效', { path }),

  taskNotFound: (id: string) =>
    new CoreError(CoreErrorCodes.TASK_NOT_FOUND, `任务不存在: ${id}`, { taskId: id }),

  taskAlreadyRunning: (id: string) =>
    new CoreError(CoreErrorCodes.TASK_ALREADY_RUNNING, `任务已在运行: ${id}`, { taskId: id }),

  taskNotRunnable: (id: string, reason: string) =>
    new CoreError(CoreErrorCodes.TASK_NOT_RUNNABLE, `任务不可运行: ${reason}`, { taskId: id, reason }),

  configNotFound: (path: string) =>
    new CoreError(CoreErrorCodes.CONFIG_DOC_NOT_FOUND, `配置文件不存在: ${path}`, { path }),

  configReadFailed: (path: string, cause?: string) =>
    new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `配置文件读取失败: ${path}`, { path, cause }),

  configWriteFailed: (path: string, cause?: string) =>
    new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, `配置文件写入失败: ${path}`, { path, cause }),

  dashboardConflict: (id: string) =>
    new CoreError(CoreErrorCodes.DASHBOARD_CONFLICT, `仪表盘冲突: ${id}`, { dashboardId: id }),

  widgetNotFound: (id: string) =>
    new CoreError(CoreErrorCodes.WIDGET_NOT_FOUND, `组件不存在: ${id}`, { widgetId: id }),

  svnSyncAlreadyRunning: (projectId: string) =>
    new CoreError(CoreErrorCodes.SVN_SYNC_ALREADY_RUNNING, `SVN 同步已在运行: ${projectId}`, { projectId }),

  svnSyncFailed: (projectId: string, reason: string) =>
    new CoreError(CoreErrorCodes.SVN_SYNC_FAILED, `SVN 同步失败: ${reason}`, { projectId, reason }),

  depInstallFailed: (packageName: string, reason: string) =>
    new CoreError(CoreErrorCodes.DEP_INSTALL_FAILED, `依赖安装失败: ${packageName}`, { packageName, reason }),

  depNotFound: (packageName: string) =>
    new CoreError(CoreErrorCodes.DEP_NOT_FOUND, `依赖不存在: ${packageName}`, { packageName }),

  editorNotFound: () =>
    new CoreError(CoreErrorCodes.EDITOR_NOT_FOUND, '编辑器不存在'),

  editorLaunchFailed: (path: string, reason?: string) =>
    new CoreError(CoreErrorCodes.EDITOR_LAUNCH_FAILED, reason ? `编辑器启动失败: ${reason}` : `编辑器启动失败: ${path}`, { path, reason }),
} as const;

export const spriteErrors = {
  configNotFound: (path: string) =>
    new SpriteError(CoreErrorCodes.SPRITE_CONFIG_NOT_FOUND, `雪碧图配置不存在: ${path}`, { path }),

  groupNotFound: (group: string) =>
    new SpriteError(CoreErrorCodes.SPRITE_GROUP_NOT_FOUND, `图标组不存在: ${group}`, { group }),

  iconsRootNotFound: (path: string) =>
    new SpriteError(CoreErrorCodes.SPRITE_ICONS_ROOT_NOT_FOUND, `图标目录不存在: ${path}`, { path }),
} as const;
