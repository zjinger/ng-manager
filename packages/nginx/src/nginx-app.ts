import { NginxService } from './nginx.service';
import { NginxConfigService } from './nginx-config.service';
import { NginxServerService } from './nginx-server.service';
import { NginxModuleService } from './nginx-module.service';
import { NginxLogService } from './nginx-log.service';

/**
 * Nginx 管理应用入口
 * 封装所有 nginx 相关服务，供 server 调用
 */
export class NginxApp {
    readonly service: NginxService;
    readonly config: NginxConfigService;
    readonly server: NginxServerService;
    readonly module: NginxModuleService;
    readonly log: NginxLogService;

    constructor() {
        this.service = new NginxService();
        this.config = new NginxConfigService(this.service);
        this.server = new NginxServerService(this.service, this.config);
        this.module = new NginxModuleService(this.service, this.config);
        this.log = new NginxLogService(this.service);
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.log.stopAll();
    }
}
