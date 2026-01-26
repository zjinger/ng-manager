import { ConfigSchema } from "./config-schema.model";
export interface DomainSchemaDoc<VM = any> {
    domainId: string;
    schema: ConfigSchema;
    vm: VM;
    options?: Record<string, any>;
    meta?: Record<string, any>;
}
