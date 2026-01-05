import { HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ApiClient } from "@app/core/api/api-client";
import { FsListResult } from "@models/fs.model";
@Injectable({ providedIn: "root" })
export class FsService {
  constructor(private api: ApiClient) { }

  ls(dirPath: string, showSystem: boolean = false) {
    return this.api.get<FsListResult>("/api/fs/ls", new HttpParams().set("path", dirPath).set("showSystem", String(showSystem === true ? "1" : "0")));
  }

  mkdir(dirPath: string, folderName: string) {
    return this.api.post<void>("/api/fs/mkdir", { path: dirPath, name: folderName });
  }
}