import { inject, Injectable } from "@angular/core";
import { ApiClient } from "@core/api";
import type {
  ConfigDetectResult,
  ConfigDocument,
  ConfigPatch,
  ConfigPreviewResult,
  ConfigProviderItem,
  ConfigWriteResult
} from "../models";

@Injectable({ providedIn: "root" })
export class ConfApiService {
  api = inject(ApiClient)

  getProviders() {
    return this.api.get<ConfigProviderItem[]>(`/api/config/providers`);
  }

  detect(projectId: string) {
    return this.api.get<ConfigDetectResult[]>(`/api/config/detect/${projectId}`);
  }

  getDoc(projectId: string, type: string, filePath?: string) {
    const query = filePath ? `?filePath=${encodeURIComponent(filePath)}` : "";
    return this.api.get<ConfigDocument>(`/api/config/doc/${projectId}/${encodeURIComponent(type)}${query}`);
  }

  preview(projectId: string, input: { type: string; filePath: string; patches: ConfigPatch[] }) {
    return this.api.post<ConfigPreviewResult>(`/api/config/preview/${projectId}`, input);
  }

  write(projectId: string, input: { type: string; filePath: string; patches: ConfigPatch[] }) {
    return this.api.post<ConfigWriteResult>(`/api/config/write/${projectId}`, input);
  }

  openInEditor(projectId: string, filePath: string) {
    return this.api.post<{ ok: boolean; filePath: string }>(
      `/api/config/openInEditor/${projectId}`,
      { filePath }
    );
  }
}
