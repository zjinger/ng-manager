import { Injectable, signal } from '@angular/core';
import { ApiRequestEntity, ApiRequestKvRow, SendResponse } from '@models/api-client';
import { uniqueId } from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class ApiClientHandleService {
  activeRequestId = signal<string | null>(null);
  activeEnvId = signal<string | null>(null);
  activeHistoryId = signal<string | null>(null);
  lastResult = signal<SendResponse | null>(null);
  activeRequest = signal<ApiRequestEntity | null>(null);
  sending = signal(false);

  setActive(request: ApiRequestEntity | null) {
    if (!request || !request.id || request.id === this.activeRequestId()) return;
    if (request.headers.length) {
      request.headers = this.ensureKvId(request.headers);
    }
    if (request.query.length) {
      request.query = this.ensureKvId(request.query);
    }
    if (request.pathParams.length) {
      request.pathParams = this.ensureKvId(request.pathParams);
    }
    this.activeRequest.set(request);
    this.activeRequestId.set(request.id);
    this.lastResult.set(null);
  }

  private ensureKvId(rows: ApiRequestKvRow[]): ApiRequestKvRow[] {
    return rows.map(ele => {
      if (!ele.id) {
        ele.id = uniqueId();
      }
      return ele;
    })
  }

  saveActive() {
    const req = this.activeRequest();
    console.log('saveActive', req);
  }

  sendActive() { 
    
  }

  patchActive(patch: Partial<ApiRequestEntity>) {
    const req = this.activeRequest();
    if (!req) return;
    const updated = { ...req, ...patch, updatedAt: Date.now() };
    this.activeRequest.set(updated);
  }


  saveRequest(request: ApiRequestEntity) { }

  deleteRequestById(requestId: string) { }


}
