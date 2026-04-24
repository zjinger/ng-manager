export { AppError } from './app-error';
export { httpStatusMap, getHttpStatus } from './http-status';

export type { GlobalErrorCode } from './sources/global.error-codes';
export type { CoreErrorCode } from './sources/core.error-codes';
export type { NginxErrorCode } from './sources/nginx.error-codes';
export type { ApiErrorCode } from './sources/api.error-codes';
export type { AisErrorCode } from './sources/ais.error-codes';
export type { RuntimeErrorCode } from './sources/runtime.error-codes';
export type { CoreErrorCode as SpriteErrorCode } from './sources/core.error-codes';

export { GlobalErrorCodes } from './sources/global.error-codes';
export { CoreErrorCodes } from './sources/core.error-codes';
export { NginxErrorCodes } from './sources/nginx.error-codes';
export { ApiErrorCodes } from './sources/api.error-codes';
export { AisErrorCodes } from './sources/ais.error-codes';
export { RuntimeErrorCodes } from './sources/runtime.error-codes';

export { GlobalError, globalErrors } from './sub-classes/global.errors';
export { NginxError, nginxErrors } from './sub-classes/nginx.errors';
export { ApiError, apiErrors } from './sub-classes/api.errors';
export { AisError, aisErrors } from './sub-classes/ais.errors';
export { RuntimeError, runtimeErrors } from './sub-classes/runtime.errors';
export { CoreError, coreErrors, SpriteError, spriteErrors } from './sub-classes/core.errors';

import type { GlobalErrorCode } from './sources/global.error-codes';
import type { CoreErrorCode } from './sources/core.error-codes';
import type { NginxErrorCode } from './sources/nginx.error-codes';
import type { ApiErrorCode } from './sources/api.error-codes';
import type { AisErrorCode } from './sources/ais.error-codes';
import type { RuntimeErrorCode } from './sources/runtime.error-codes';
export type ErrorCode = GlobalErrorCode | CoreErrorCode | NginxErrorCode | ApiErrorCode | AisErrorCode | RuntimeErrorCode;