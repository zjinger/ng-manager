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
 * Upstream 负载策略
 */
export type NginxUpstreamStrategy = 'round-robin' | 'least_conn' | 'ip_hash' | 'hash';

/**
 * Upstream 配置
 */
export interface NginxUpstream {
  /** 唯一标识 */
  id: string;
  /** upstream 名称 */
  name: string;
  /** 负载策略 */
  strategy: NginxUpstreamStrategy;
  /** 后端节点地址列表 */
  nodes: string[];
  /** 健康检查文案（占位） */
  health?: string;
  /** 是否健康 */
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
  /** 唯一标识 */
  id: string;
  /** 绑定域名 */
  domain: string;
  /** 证书文件路径 */
  certPath: string;
  /** 私钥路径 */
  keyPath: string;
  /** 到期时间（YYYY-MM-DD） */
  expireAt: string;
  /** 状态 */
  status: NginxSslStatus;
  /** 是否启用自动续期 */
  autoRenew: boolean;
}

/**
 * 流量控制配置
 */
export interface NginxTrafficConfig {
  /** 是否启用请求限流 */
  rateLimitEnabled: boolean;
  /** 限流值，如 20r/s */
  rateLimit: string;
  /** 是否启用连接限制 */
  connLimitEnabled: boolean;
  /** 最大并发连接数 */
  connLimit: number;
  /** 黑名单 IP */
  blacklistIps: string[];
}

/**
 * 性能优化配置
 */
export interface NginxPerformanceConfig {
  /** gzip 开关 */
  gzipEnabled: boolean;
  /** gzip types */
  gzipTypes: string;
  /** keepalive timeout */
  keepaliveTimeout: string;
  /** worker_processes */
  workerProcesses: string;
  /** sendfile 开关 */
  sendfile: boolean;
  /** tcp_nopush 开关 */
  tcpNopush: boolean;
}
