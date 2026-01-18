import { inject, Injectable } from "@angular/core";
import { map } from "rxjs/operators";
import { ApiClient } from "@core/api";
export type ConfigGroup = { id: string; title: string; fields: ConfigField[] };
export type ConfigCategory = { id: string; name: string; description?: string; icon?: string; groups: ConfigGroup[] };

export type ConfigDescriptor = {
  projectType: "angular";
  file: string;
  categories: ConfigCategory[];
};
export type ConfigField =
  | { kind: "boolean"; key: string; label: string; path: string; default?: boolean; help?: string }
  | { kind: "string"; key: string; label: string; path: string; placeholder?: string; help?: string }
  | { kind: "path"; key: string; label: string; path: string; mustExist?: boolean; placeholder?: string; help?: string }
  | { kind: "select"; key: string; label: string; path: string; options: { label: string; value: any }[]; help?: string };


export type JsonPatchOp =
  | { op: "add" | "replace"; path: string; value: any }
  | { op: "remove"; path: string };

@Injectable({ providedIn: "root" })
export class ConfApiService {
  api = inject(ApiClient)

  getDescriptor(projectId: string) {
    return this.api.get<ConfigDescriptor>(`/api/config/descriptor/${projectId}`);
  }

  getValues(projectId: string) {
    return this.api.get<{ file: string; values: Record<string, any> }>(`/api/config/values/${projectId}`);
  }

  patch(projectId: string, patch: JsonPatchOp[], dryRun = true) {
    return this.api.post<{ result: any }>(`/api/config/patch/${projectId}`, { patch, dryRun }).pipe(
      map((r) => r.result)
    );
  }

  rollback(projectId: string, backupId: string) {
    return this.api.post<{ result: any }>(`/api/config/rollback/${projectId}`, { backupId }).pipe(
      map((r) => r.result)
    );
  }
}
