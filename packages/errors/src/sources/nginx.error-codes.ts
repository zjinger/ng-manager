/**
 * Nginx 错误码 (20XXX)
 *
 * | 码值   | 常量名                        | 说明                   | HTTP Status |
 * |--------|------------------------------|------------------------|-------------|
 * |         【生命周期 200XX】                            |
 * | 20001  | NGINX_NOT_BOUND              | Nginx 未绑定            | 400         |
 * | 20002  | NGINX_ALREADY_RUNNING        | Nginx 已在运行          | 409         |
 * | 20003  | NGINX_NOT_RUNNING            | Nginx 未运行            | 400         |
 * | 20004  | NGINX_START_FAILED           | Nginx 启动失败          | 500         |
 * | 20005  | NGINX_STOP_FAILED            | Nginx 停止失败          | 500         |
 * | 20006  | NGINX_RELOAD_FAILED          | Nginx 重载失败          | 500         |
 * | 20007  | NGINX_TEST_FAILED            | 配置检测失败            | 400         |
 * |         【配置 201XX】                                  |
 * | 20101  | NGINX_CONFIG_READ_FAILED     | 配置文件读取失败        | 500         |
 * | 20102  | NGINX_CONFIG_WRITE_FAILED    | 配置文件写入失败        | 500         |
 * | 20103  | NGINX_CONFIG_INVALID         | 配置文件格式无效        | 400         |
 * | 20104  | NGINX_CONFIG_NOT_MANAGEABLE  | 配置文件不在管理范围    | 403         |
 * |         【Server 块 202XX】                            |
 * | 20201  | NGINX_SERVER_NOT_FOUND       | Server 块不存在         | 404         |
 * | 20202  | NGINX_SERVER_ALREADY_EXISTS  | Server 块已存在         | 409         |
 * | 20203  | NGINX_SERVER_PORT_CONFLICT   | 端口冲突               | 409         |
 * | 20204  | NGINX_SERVER_NAME_CONFLICT   | Server 名称冲突         | 409         |
 * | 20205  | NGINX_SERVER_FILE_INVALID    | Server 配置文件无效     | 400         |
 * | 20206  | NGINX_SERVER_DELETE_BLOCKED  | Server 删除被阻止       | 409         |
 * | 20207  | NGINX_SERVER_IMPORT_FAILED   | Server 导入失败         | 400         |
 * |         【SSL 203XX】                                  |
 * | 20301  | NGINX_SSL_CERT_NOT_FOUND     | SSL 证书文件不存在      | 400         |
 * | 20302  | NGINX_SSL_KEY_NOT_FOUND      | SSL 密钥文件不存在      | 400         |
 * | 20303  | NGINX_SSL_CERT_INVALID       | SSL 证书无效            | 400         |
 * |         【Upstream 204XX】                            |
 * | 20401  | NGINX_UPSTREAM_NOT_FOUND     | Upstream 不存在         | 404         |
 * | 20402  | NGINX_UPSTREAM_ALREADY_EXISTS | Upstream 已存在         | 409         |
 * | 20403  | NGINX_UPSTREAM_NODE_INVALID  | Upstream 节点无效       | 400         |
 */
export const NginxErrorCodes = {
  NGINX_NOT_BOUND: 20001,
  NGINX_ALREADY_RUNNING: 20002,
  NGINX_NOT_RUNNING: 20003,
  NGINX_START_FAILED: 20004,
  NGINX_STOP_FAILED: 20005,
  NGINX_RELOAD_FAILED: 20006,
  NGINX_TEST_FAILED: 20007,
  NGINX_CONFIG_READ_FAILED: 20101,
  NGINX_CONFIG_WRITE_FAILED: 20102,
  NGINX_CONFIG_INVALID: 20103,
  NGINX_CONFIG_NOT_MANAGEABLE: 20104,
  NGINX_SERVER_NOT_FOUND: 20201,
  NGINX_SERVER_ALREADY_EXISTS: 20202,
  NGINX_SERVER_PORT_CONFLICT: 20203,
  NGINX_SERVER_NAME_CONFLICT: 20204,
  NGINX_SERVER_FILE_INVALID: 20205,
  NGINX_SERVER_DELETE_BLOCKED: 20206,
  NGINX_SERVER_IMPORT_FAILED: 20207,
  NGINX_SSL_CERT_NOT_FOUND: 20301,
  NGINX_SSL_KEY_NOT_FOUND: 20302,
  NGINX_SSL_CERT_INVALID: 20303,
  NGINX_UPSTREAM_NOT_FOUND: 20401,
  NGINX_UPSTREAM_ALREADY_EXISTS: 20402,
  NGINX_UPSTREAM_NODE_INVALID: 20403,
} as const;

export type NginxErrorCode = typeof NginxErrorCodes[keyof typeof NginxErrorCodes];
