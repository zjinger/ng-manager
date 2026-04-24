import type { ErrorPolicyCode } from '../error';

export class ApiBizError extends Error {
  constructor(
    public code: ErrorPolicyCode,
    message: string,
    public details?: unknown,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiBizError';
  }
}
