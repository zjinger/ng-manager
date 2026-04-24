import { AppError } from '../app-error';
import { NginxErrorCodes, type NginxErrorCode } from '../sources/nginx.error-codes';

export class NginxError extends AppError<NginxErrorCode> {
  public readonly source = '@yinuo-ngm/nginx';
}

export const nginxErrors = {
  notBound: (path?: string) =>
    new NginxError(NginxErrorCodes.NGINX_NOT_BOUND, 'Nginx 未绑定，请先绑定 Nginx 实例', path ? { path } : undefined),

  alreadyRunning: () =>
    new NginxError(NginxErrorCodes.NGINX_ALREADY_RUNNING, 'Nginx 已在运行'),

  notRunning: () =>
    new NginxError(NginxErrorCodes.NGINX_NOT_RUNNING, 'Nginx 未运行'),

  startFailed: (reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_START_FAILED, `Nginx 启动失败: ${reason}`, { reason }),

  stopFailed: (reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_STOP_FAILED, `Nginx 停止失败: ${reason}`, { reason }),

  reloadFailed: (reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_RELOAD_FAILED, `Nginx 重载失败: ${reason}`, { reason }),

  testFailed: (errors?: string[]) =>
    new NginxError(NginxErrorCodes.NGINX_TEST_FAILED, errors?.length ? `配置检测失败: ${errors.join(', ')}` : '配置检测失败', errors ? { errors } : undefined),

  configReadFailed: (filePath: string, cause?: string) =>
    new NginxError(NginxErrorCodes.NGINX_CONFIG_READ_FAILED, `读取配置文件失败: ${filePath}`, { filePath, cause }),

  configWriteFailed: (filePath: string, cause?: string) =>
    new NginxError(NginxErrorCodes.NGINX_CONFIG_WRITE_FAILED, `写入配置文件失败: ${filePath}`, { filePath, cause }),

  configInvalid: (filePath: string, reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_CONFIG_INVALID, `配置文件无效: ${reason}`, { filePath, reason }),

  configNotManageable: (filePath: string) =>
    new NginxError(NginxErrorCodes.NGINX_CONFIG_NOT_MANAGEABLE, `配置文件不在可管理范围: ${filePath}`, { filePath }),

  serverNotFound: (id: string) =>
    new NginxError(NginxErrorCodes.NGINX_SERVER_NOT_FOUND, `Server 不存在: ${id}`, { serverId: id }),

  serverAlreadyExists: (name: string) =>
    new NginxError(NginxErrorCodes.NGINX_SERVER_ALREADY_EXISTS, `Server 已存在: ${name}`, { name }),

  serverPortConflict: (port: number, owners: string[]) =>
    new NginxError(NginxErrorCodes.NGINX_SERVER_PORT_CONFLICT, `端口 ${port} 已被 ${owners.join(', ')} 占用`, { port, owners }),

  serverNameConflict: (name: string) =>
    new NginxError(NginxErrorCodes.NGINX_SERVER_NAME_CONFLICT, `Server 名称冲突: ${name}`, { name }),

  serverFileInvalid: (filePath: string, reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_SERVER_FILE_INVALID, `Server 配置文件无效: ${reason}`, { filePath, reason }),

  serverDeleteBlocked: (reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_SERVER_DELETE_BLOCKED, `删除被阻止: ${reason}`, { reason }),

  serverImportFailed: (reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_SERVER_IMPORT_FAILED, `Server 导入失败: ${reason}`, { reason }),

  sslCertNotFound: (path: string) =>
    new NginxError(NginxErrorCodes.NGINX_SSL_CERT_NOT_FOUND, `SSL 证书文件不存在: ${path}`, { path }),

  sslKeyNotFound: (path: string) =>
    new NginxError(NginxErrorCodes.NGINX_SSL_KEY_NOT_FOUND, `SSL 密钥文件不存在: ${path}`, { path }),

  sslCertInvalid: (path: string, reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_SSL_CERT_INVALID, `SSL 证书无效: ${reason}`, { path, reason }),

  upstreamNotFound: (name: string) =>
    new NginxError(NginxErrorCodes.NGINX_UPSTREAM_NOT_FOUND, `Upstream 不存在: ${name}`, { name }),

  upstreamAlreadyExists: (name: string) =>
    new NginxError(NginxErrorCodes.NGINX_UPSTREAM_ALREADY_EXISTS, `Upstream 已存在: ${name}`, { name }),

  upstreamNodeInvalid: (node: string, reason: string) =>
    new NginxError(NginxErrorCodes.NGINX_UPSTREAM_NODE_INVALID, `Upstream 节点无效: ${reason}`, { node, reason }),
} as const;
