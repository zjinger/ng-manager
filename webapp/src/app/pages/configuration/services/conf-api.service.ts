import { HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { ApiClient } from "@core/api";
import { firstValueFrom } from "rxjs";
import { ConfigCatalogDocV1, ConfigFileType, ConfigPatch, ConfigViewModel, DomainSchemaDoc } from "../models";
import { ConfigFileReadResult, ResolvedDomain } from "../models/config-domain.model";

@Injectable({ providedIn: "root" })
export class ConfApiService {
  api = inject(ApiClient)
  // getCatalog(pid:string) -> Observable<ConfigCatalogDocV1>
  getCatalog(pid: string) {
    return this.api.get<ConfigCatalogDocV1>(`/api/config/catalog/${pid}`);
  }

  getWorkspacePromise(pid: string, type: ConfigFileType, relPath?: string) {
    const params = new HttpParams().set("type", type)
    //.set("relPath", relPath);
    return firstValueFrom(this.api.get<{ filePath: string; raw: any }>(`/api/config/workspace/${pid}`, params));
  }

  getViewModelPromise(
    pid: string,
    query: {
      type?: ConfigFileType;
      project?: string;
      target?: string;
      configuration?: string
    }
  ): Promise<ConfigViewModel> {
    let params = new HttpParams();
    if (query.type) params = params.set("type", query.type);
    if (query.project) params = params.set("project", query.project);
    if (query.target) params = params.set("target", query.target);
    if (query.configuration) params = params.set("configuration", query.configuration);
    return firstValueFrom(this.api.get<ConfigViewModel>(`/api/config/view-model/${pid}`, params));
  }

  applyConfigPromise(pid: string, body: { type: ConfigFileType; patch: ConfigPatch }) {
    return firstValueFrom(this.api.post<void>(`/api/config/apply/${pid}`, body));
  }


  getCatalogV2(projectId: string) {
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
