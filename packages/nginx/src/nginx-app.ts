import { NginxService } from './nginx.service';
import { NginxConfigService } from './nginx-config.service';
import { NginxServerService } from './nginx-server.service';
import { NginxModuleService } from './nginx-module.service';

/**
 * Nginx 管理应用入口
 * 封装所有 nginx 相关服务，供 server 调用
 */
export class NginxApp {
    readonly service: NginxService;
    readonly config: NginxConfigService;
    readonly server: NginxServerService;
    readonly module: NginxModuleService;

    constructor() {
        this.service = new NginxService();
        this.config = new NginxConfigService(this.service);
        this.server = new NginxServerService(this.service, this.config);
        this.module = new NginxModuleService(this.service);
    }
}
