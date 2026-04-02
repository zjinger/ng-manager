import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";

type TokenRateBucket = {
  windowStart: number;
  count: number;
  lastSeen: number;
};

export type TokenRateLimiterOptions = {
  windowMs?: number;
  limitPerWindow?: number;
  entryTtlMs?: number;
  cleanupThreshold?: number;
};

const DEFAULT_WINDOW_MS = 60 * 1000; // 默认窗口时间为1分钟
const DEFAULT_LIMIT_PER_WINDOW = 600; // 默认每个窗口允许600次请求（平均每秒10次）
const DEFAULT_ENTRY_TTL_MS = DEFAULT_WINDOW_MS * 5; // 默认条目TTL为窗口时间的5倍，即5分钟
const DEFAULT_CLEANUP_THRESHOLD = 2048; // 默认当桶数量超过2048时触发清理

/**
 * TokenRateLimiter是一个基于令牌的速率限制器，用于限制每个令牌在指定时间窗口内的请求次数。
 * 它使用一个Map来存储每个令牌的请求计数和窗口开始时间，并在每次请求时检查是否超过限制。
 * 当桶数量超过指定阈值时，它会清理过期的桶以释放内存。
 * 使用示例：
 * const limiter = new TokenRateLimiter({ windowMs: 60000, limitPerWindow: 600 });
 * try {
 *   limiter.enforce(tokenKey);
 *   // 处理请求
 * } catch (err) {
 *   if (err instanceof AppError && err.code === ERROR_CODES.TOKEN_RATE_LIMITED) {
 *     // 处理速率限制错误
 *   } else {
 *     // 处理其他错误
 *   }
 * }
 */
export class TokenRateLimiter {
  private readonly buckets = new Map<string, TokenRateBucket>();
  private readonly windowMs: number;
  private readonly limitPerWindow: number;
  private readonly entryTtlMs: number;
  private readonly cleanupThreshold: number;

  constructor(options: TokenRateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    this.limitPerWindow = options.limitPerWindow ?? DEFAULT_LIMIT_PER_WINDOW;
    this.entryTtlMs = options.entryTtlMs ?? DEFAULT_ENTRY_TTL_MS;
    this.cleanupThreshold = options.cleanupThreshold ?? DEFAULT_CLEANUP_THRESHOLD;
  }

  enforce(tokenKey: string, now = Date.now()): void {
    let bucket = this.buckets.get(tokenKey);
    if (!bucket) {
      this.buckets.set(tokenKey, { windowStart: now, count: 1, lastSeen: now });
      return;
    }

    const inCurrentWindow = now - bucket.windowStart < this.windowMs;
    if (!inCurrentWindow) {
      bucket.windowStart = now;
      bucket.count = 1;
      bucket.lastSeen = now;
      this.buckets.set(tokenKey, bucket);
      return;
    }

    bucket.count += 1;
    bucket.lastSeen = now;
    this.buckets.set(tokenKey, bucket);

    if (bucket.count > this.limitPerWindow) {
      throw new AppError(ERROR_CODES.TOKEN_RATE_LIMITED, "token request rate limited", 429, {
        limit: this.limitPerWindow,
        windowMs: this.windowMs
      });
    }
  }

  cleanup(now = Date.now()): void {
    if (this.buckets.size < this.cleanupThreshold) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastSeen > this.entryTtlMs) {
        this.buckets.delete(key);
      }
    }
  }
}

