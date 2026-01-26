import { ConfigDomain } from "./domains";

/**
 * 只存 ConfigDomain[]
 * 支持插件注册（未来 @core/plugins/config-angular）
 */
export class ConfigRegistry {
    private domains = new Map<string, ConfigDomain>();

    /**
     * 注册配置域
     * @param domain 
     */
    register(domain: ConfigDomain): void {
        this.domains.set(domain.id, domain);
    }
    
    /**
     * 批量注册配置域
     * @param domains
     */
    registerMany(domains: ConfigDomain[]): void {
        for (const d of domains) this.register(d);
    }

    /**
     * 列出所有配置域
     * @returns domains
     */
    list(): ConfigDomain[] {
        return [...this.domains.values()];
    }

    /**
     * 获取指定配置域
     * @param id 
     * @returns domain | undefined
     */
    get(id: string): ConfigDomain | undefined {
        return this.domains.get(id);
    }
}
