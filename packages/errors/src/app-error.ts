export class AppError<const C extends number = number> extends Error {
  public readonly code: C;
  public readonly source: string;
  public readonly timestamp: number;

  constructor(
    code: C,
    message: string,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.source = '@yinuo-ngm/errors';
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      source: this.source,
      timestamp: this.timestamp,
      meta: this.meta,
    };
  }
}
