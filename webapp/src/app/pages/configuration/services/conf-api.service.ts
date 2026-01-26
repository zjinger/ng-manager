import { inject, Injectable } from "@angular/core";
import { ApiClient } from "@core/api";
import { DomainSchemaDiffResult, DomainSchemaDoc, ResolvedDomain } from "../models";

@Injectable({ providedIn: "root" })
export class ConfApiService {
  api = inject(ApiClient)

  getCatalog(projectId: string) {
    return this.api.get<ResolvedDomain[]>(`/api/config/catalog/${projectId}`)
  }
  // /openInEditor/:projectId/:docId
  openInEditor(projectId: string, docId: string) {
    return this.api.post(
      `/api/config/openInEditor/${projectId}/${encodeURIComponent(docId)}`,
      {}
    );
  }

  writeDomainSchema(projectId: string, domainId: string, vm: any) {
    return this.api.post(`/api/config/writeSchema/${projectId}/${domainId}`, { vm });
  }

  getDomainSchemas(projectId: string, domainId: string) {
    return this.api.get<DomainSchemaDoc>(`/api/config/getDomainSchema/${projectId}/${domainId}`)
  }

  diffDomainSchema(projectId: string, domainId: string, vm: any) {
    return this.api.post<DomainSchemaDiffResult>(`/api/config/diffSchema/${projectId}/${domainId}`, { vm });
  }
}
