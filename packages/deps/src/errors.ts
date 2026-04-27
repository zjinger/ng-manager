import { CoreError, CoreErrorCodes } from '@yinuo-ngm/errors';

export class DepInstallError extends CoreError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(CoreErrorCodes.DEP_INSTALL_FAILED, message, details);
    }
}

export class DepUninstallError extends CoreError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(CoreErrorCodes.DEP_UNINSTALL_FAILED, message, details);
    }
}
