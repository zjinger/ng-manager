import { ConfigSchema, DomainSchemaContext, DomainSchemaDiffResult } from "./schema.types";

export interface DomainSchemaProvider<VM = any> {
    readonly domainId: string;

    getSchema(): ConfigSchema;

    assemble(docs: Record<string, any>, ctx: DomainSchemaContext): VM;

    diff(baseline: VM, current: VM, ctx: DomainSchemaContext): DomainSchemaDiffResult;
    
    getOptions?(docs: Record<string, any>, ctx: DomainSchemaContext, vm: VM): Record<string, any>;

    validate?(vm: VM, ctx: DomainSchemaContext): void;
}

export class DomainSchemaRegistry {
    private providers = new Map<string, DomainSchemaProvider>();

    register(p: DomainSchemaProvider) {
        if (this.providers.has(p.domainId)) {
            console.warn(`DomainSchemaProvider already registered: ${p.domainId}, override it.`);
        }
        this.providers.set(p.domainId, p);
    }

    get(domainId: string): DomainSchemaProvider | undefined {
        return this.providers.get(domainId);
    }

    list() {
        return [...this.providers.values()];
    }
}
