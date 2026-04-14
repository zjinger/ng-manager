/**
 * Nginx 管理相关类型定义
 */

/**
 * Nginx 实例信息
 */
export interface NginxInstance {
  /** nginx 可执行文件路径 */
  path: string;
  /** 版本号 */
  version: string;
  /** 主配置文件路径 */
  configPath: string;
  /** 安装前缀路径 */
  prefixPath: string;
  /** 是否已绑定 */
  isBound: boolean;
}

/**
 * Nginx 运行状态
 */
export interface NginxStatus {
  /** 是否运行中 */
  isRunning: boolean;
  /** 进程 ID */
  pid?: number;
  /** 运行时间 */
  uptime?: string;
  /** 活跃连接数（尽力统计，可能为空） */
  activeConnections?: number;
  /** worker 进程数 */
  workerProcesses?: number;
}

/**
 * Nginx 绑定请求
 */
export interface NginxBindRequest {
  /** nginx 可执行文件路径 */
  path: string;
}

/**
 * Nginx 配置信息
 */
export interface NginxConfig {
  /** 主配置文件路径 */
  mainConfigPath: string;
  /** 配置文件内容 */
  content: string;
  /** 是否可写 */
  isWritable: boolean;
}

/**
 * Location 块
 */
export interface NginxLocation {
  /** location 路径 */
  path: string;
  /** 代理目标 */
  proxyPass?: string;
  /** 根目录 */
  root?: string;
  /** 默认文件 */
  index?: string[];
  /** try_files 配置 */
  tryFiles?: string[];
  /** 原始配置文本 */
  rawConfig?: string;
}

/**
 * Server 块
 */
export interface NginxServer {
  /** 唯一标识 */
  id: string;
  /** server_name */
  name: string;
  /** 监听端口 */
  listen: string[];
  /** 域名列表 */
  domains?: string[];
  /** 根目录 */
  root?: string;
  /** location 块列表 */
  locations: NginxLocation[];
  /** 是否启用 SSL */
  ssl: boolean;
  /** SSL 证书路径 */
  sslCert?: string;
  /** SSL 密钥路径 */
  sslKey?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 自定义配置片段 */
  extraConfig?: string;
  /** 原始配置文本 */
  configText: string;
  /** 配置文件路径 */
  filePath?: string;
}

/**
 * 创建 Server 请求
 */
export interface CreateNginxServerRequest {
  /** server_name */
  name: string;
  /** 监听端口 */
  listen: string[];
  /** 域名列表 */
  domains?: string[];
  /** 根目录 */
  root?: string;
  /** location 块列表 */
  locations: NginxLocation[];
  /** 是否启用 SSL */
  ssl?: boolean;
  /** 协议 */
  protocol?: 'http' | 'https';
  /** SSL 证书路径 */
  sslCert?: string;
  /** SSL 密钥路径 */
  sslKey?: string;
  /** 是否立即启用 */
  enabled?: boolean;
  /** 自定义配置片段 */
  extraConfig?: string;
}

/**
 * 更新 Server 请求
 */
export interface UpdateNginxServerRequest {
  /** server_name */
  name?: string;
  /** 监听端口 */
  listen?: string[];
  /** 域名列表 */
  domains?: string[];
  /** 根目录 */
  root?: string;
  /** location 块列表 */
  locations?: NginxLocation[];
  /** 是否启用 SSL */
  ssl?: boolean;
  /** 协议 */
  protocol?: 'http' | 'https';
  /** SSL 证书路径 */
  sslCert?: string;
  /** SSL 密钥路径 */
  sslKey?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 自定义配置片段 */
  extraConfig?: string;
}

/**
 * Nginx 命令执行结果
 */
export interface NginxCommandResult {
  /** 是否成功 */
  success: boolean;
  /** 输出内容 */
  output?: string;
  /** 错误内容 */
  error?: string;
  /** 退出码 */
  exitCode?: number;
}

/**
 * 配置验证结果
 */
export interface NginxConfigValidation {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors?: string[];
  /** 警告信息 */
  warnings?: string[];
}

/**
 * Nginx 状态响应
 */
export interface NginxStatusResponse {
  instance: NginxInstance | null;
  status: NginxStatus;
}

export interface NginxServerSummary {
  total: number;
  enabled: number;
  disabled: number;
}

export interface NginxStatsResponse {
  success: boolean;
  instance?: NginxInstance | null;
  status?: NginxStatus;
  serverSummary?: NginxServerSummary;
  error?: string;
}

/**
 * Nginx 绑定响应
 */
export interface NginxBindResponse {
  success: boolean;
  instance?: NginxInstance;
  error?: string;
}

/**
 * Upstream 负载策略
 */
export type NginxUpstreamStrategy = 'round-robin' | 'least_conn' | 'ip_hash' | 'hash';

/**
 * Upstream 配置
 */
export interface NginxUpstream {
  id: string;
  name: string;
  strategy: NginxUpstreamStrategy;
  nodes: string[];
  health?: string;
  healthy?: boolean;
}

/**
 * SSL 状态
 */
export type NginxSslStatus = 'valid' | 'expiring' | 'expired' | 'pending';

/**
 * SSL 证书配置
 */
export interface NginxSslCertificate {
  id: string;
  domain: string;
  certPath: string;
  keyPath: string;
  expireAt: string;
  status: NginxSslStatus;
  autoRenew: boolean;
}

/**
 * 流量控制配置
 */
export interface NginxTrafficConfig {
  rateLimitEnabled: boolean;
  rateLimit: string;
  connLimitEnabled: boolean;
  connLimit: number;
  blacklistIps: string[];
}

/**
 * 性能优化配置
 */
export interface NginxPerformanceConfig {
  gzipEnabled: boolean;
  gzipTypes: string;
  keepaliveTimeout: string;
  workerProcesses: string;
  sendfile: boolean;
  tcpNopush: boolean;
}
