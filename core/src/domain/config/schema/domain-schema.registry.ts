import { ConfigSchema, DomainSchemaContext, DomainSchemaDiffResult } from "./schema.types";

export interface DomainSchemaProvider<VM = any> {
    readonly domainId: string;

    /** 返回 schema（来自 angular.schema.ts） */
    getSchema(): ConfigSchema;

    /** 从 domain docs 组装 VM */
    assemble(docs: Record<string, any>, ctx: DomainSchemaContext): VM;

    /** 计算 VM 差异，返回写回指令 */
    diff(baseline: VM, current: VM, ctx: DomainSchemaContext): DomainSchemaDiffResult;
    
    /** 提供 UI options（projects/targets/configurations 等） */
    getOptions?(docs: Record<string, any>, ctx: DomainSchemaContext, vm: VM): Record<string, any>;

    /** 可选：校验当前 VM 是否有效，抛错则表示无效 */
    validate?(vm: VM, ctx: DomainSchemaContext): void;
}

export class DomainSchemaRegistry {
    private providers = new Map<string, DomainSchemaProvider>();

    register(p: DomainSchemaProvider) {
        if (this.providers.has(p.domainId)) {
            // throw new Error(`DomainSchemaProvider already registered: ${p.domainId}`);
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
