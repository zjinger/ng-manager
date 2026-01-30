//  core/src/domain/config/schema/schema.domain.dto.ts
import type { ConfigSchema } from "./schema.types";

export interface DomainSchemaDoc<VM = any> {
    domainId: string;
    schema: ConfigSchema;
    vm: VM;
    options?: Record<string, any>;
    meta?: Record<string, any>;
}
