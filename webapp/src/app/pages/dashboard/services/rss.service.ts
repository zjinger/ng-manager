import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RssFeed } from '../dashboard.model';
import { ApiClient } from '@core/api';

@Injectable({
  providedIn: 'root',
})
export class RssService {
  private api: ApiClient = inject(ApiClient);
  /**
   * 预览 RSS 订阅源
   * @param url RSS 订阅源 URL
   * @param opts 选项
   *  - limit: 限制返回的条目数量，默认 20
   *  - force: 是否强制刷新，默认 false
   *  - cacheSec: 缓存时间，单位秒，默认 300
   * @returns RSS 订阅源内容
   */
  preview(url: string, opts?: { limit?: number; force?: boolean; cacheSec?: number }): Observable<RssFeed> {
    let params = new HttpParams().set("url", url);
    if (opts?.limit) params = params.set("limit", String(opts.limit));
    if (opts?.cacheSec) params = params.set("cacheSec", String(opts.cacheSec));
    if (opts?.force) params = params.set("force", "1");
    return this.api.get<RssFeed>("/api/rss/preview", params);
  }
}
