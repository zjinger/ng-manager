import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '../../../core/http/api-client.service';
import type { ChangePasswordInput } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly api = inject(ApiClientService);

  changePassword(input: ChangePasswordInput) {
    return this.api.post('/auth/change-password', input);
  }
}
