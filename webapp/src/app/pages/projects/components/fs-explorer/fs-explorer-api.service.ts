import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api';
import { FsListResult } from '@models/fs.model';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FsExplorerApiService {
  private api = inject(ApiClient);
  ls(dirPath: string, showSystem = false) {
    const params = new HttpParams()
      .set("path", dirPath)
      .set("showSystem", showSystem ? "1" : "0");
    return this.api.get<FsListResult>("/api/fs/ls", params);
  }

  mkdir(dirPath: string, folderName: string) {
    return this.api.post<void>("/api/fs/mkdir", { path: dirPath, name: folderName });
  }

  pathExists(path: string) {
    const params = new HttpParams().set("path", path);
    return this.api.get<{ exists: boolean }>("/api/fs/path-exists", params).pipe(
      map(res => res.exists)
    );
  }
}
