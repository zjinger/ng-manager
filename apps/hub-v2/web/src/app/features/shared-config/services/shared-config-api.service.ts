import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import type {
  CreateSharedConfigInput,
  SharedConfigEntity,
  SharedConfigListQuery,
  SharedConfigListResult,
  UpdateSharedConfigInput,
} from '../models/shared-config.model';

@Injectable({ providedIn: 'root' })
export class SharedConfigApiService {
  private readonly api = inject(ApiClientService);

  list(query: Partial<SharedConfigListQuery>) {
    return this.api.get<SharedConfigListResult>('/shared-configs', query);
  }

  create(input: CreateSharedConfigInput) {
    return this.api.post<SharedConfigEntity, CreateSharedConfigInput>('/shared-configs', input);
  }

  update(configId: string, input: UpdateSharedConfigInput) {
    return this.api.patch<SharedConfigEntity, UpdateSharedConfigInput>(`/shared-configs/${configId}`, input);
  }
}
