import { ConfigDomain } from "./domains";

export class ConfigRegistry {
    private domains = new Map<string, ConfigDomain>();

    register(domain: ConfigDomain): void {
        this.domains.set(domain.id, domain);
    }
    
    registerMany(domains: ConfigDomain[]): void {
        for (const d of domains) this.register(d);
    }

    list(): ConfigDomain[] {
        return [...this.domains.values()];
    }

    get(id: string): ConfigDomain | undefined {
        return this.domains.get(id);
    }
}
