import { inject, Injectable } from "@angular/core";
import { ApiClient } from "@core/api";
import { ConfigFileReadResult, DomainSchemaDoc, ResolvedDomain } from "../models";

@Injectable({ providedIn: "root" })
export class ConfApiService {
  api = inject(ApiClient)

  getCatalog(projectId: string) {
    return this.api.get<ResolvedDomain[]>(`/api/config/catalog/${projectId}`)
  }

  readDocV2(projectId: string, docId: string) {
    return this.api.get<ConfigFileReadResult>(
      `/api/config/readDoc/${projectId}/${encodeURIComponent(docId)}`
    )
  }

  writeDocV2(projectId: string, docId: string, payload: { raw?: string; data?: any }) {
    return this.api.post(
      `/api/config/writeDoc/${projectId}/${encodeURIComponent(docId)}`,
      payload
    );
  }

  // /openInEditor/:projectId/:docId
  openInEditor(projectId: string, docId: string) {
    return this.api.post(
      `/api/config/openInEditor/${projectId}/${encodeURIComponent(docId)}`,
      {}
    );
  }

  readDomainSchema(projectId: string, domainId: string) {
    return this.api.get(`/api/config/readSchema/${projectId}/${domainId}`)
  }
  writeDomainSchema(projectId: string, domainId: string, vm: any) {
    return this.api.post(`/api/config/writeSchema/${projectId}/${domainId}`, { vm });
  }

  getDomainSchemas(projectId: string, domainId: string) {
    return this.api.get<DomainSchemaDoc>(`/api/config/getDomainSchema/${projectId}/${domainId}`)
  }


}
