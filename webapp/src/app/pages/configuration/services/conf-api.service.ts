import { inject, Injectable } from "@angular/core";
import { ApiClient } from "@core/api";
import { ResolvedDomain } from "../models";
import type {
  DiffSchemaRequestDto,
  DomainSchemaDiffResultDto,
  DomainSchemaDocDto,
  OpenDocResponseDto,
  WriteSchemaRequestDto,
  WriteSchemaResponseDto,
} from "@yinuo-ngm/protocol";

@Injectable({ providedIn: "root" })
export class ConfApiService {
  api = inject(ApiClient)

  getCatalog(projectId: string) {
    return this.api.get<ResolvedDomain[]>(`/api/config/catalog/${projectId}`)
  }
  // /openInEditor/:projectId/:docId
  openInEditor(projectId: string, docId: string) {
    return this.api.post<OpenDocResponseDto>(
      `/api/config/openInEditor/${projectId}/${encodeURIComponent(docId)}`,
      {}
    );
  }

  writeDomainSchema(projectId: string, domainId: string, vm: any) {
    const body: WriteSchemaRequestDto = { vm };
    return this.api.post<WriteSchemaResponseDto>(`/api/config/writeSchema/${projectId}/${domainId}`, body);
  }

  getDomainSchemas(projectId: string, domainId: string) {
    return this.api.get<DomainSchemaDocDto>(`/api/config/getDomainSchema/${projectId}/${domainId}`)
  }

  diffDomainSchema(projectId: string, domainId: string, vm: any) {
    const body: DiffSchemaRequestDto = { vm };
    return this.api.post<DomainSchemaDiffResultDto>(`/api/config/diffSchema/${projectId}/${domainId}`, body);
  }
}
