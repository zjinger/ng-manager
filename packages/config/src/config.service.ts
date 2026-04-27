import { ConfigFileReadResult, ResolvedDomain } from "./config.types";
import { DomainSchemaDiffResult } from "./schema";
import { DomainSchemaDoc } from "./schema/schema.domain.dto";

export interface ConfigService {
    getCatalog(projectId: string): Promise<ResolvedDomain[]>;
    readDoc(projectId: string, docId: string): Promise<ConfigFileReadResult>;
    writeDoc(projectId: string, docId: string, next: unknown): Promise<void>;
    openDoc(projectId: string, docId: string): Promise<{ root: string; filePath: string }>;
    getDomainSchemaDoc(projectId: string, domainId: string): Promise<DomainSchemaDoc>;
    readDomainSchema(projectId: string, domainId: string): Promise<any>;
    writeDomainSchema(projectId: string, domainId: string, nextVM: any): Promise<void>;
    diffDomainSchema(projectId: string, domainId: string, currentVM: any): Promise<DomainSchemaDiffResult>;
}
