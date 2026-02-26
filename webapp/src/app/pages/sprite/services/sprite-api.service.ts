import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@app/core/api';
import { GenerateSpriteOptions } from '../models';

@Injectable({
  providedIn: 'root',
})
export class SpriteApiService {
  private api = inject(ApiClient);

  generate(projectId: string, options: GenerateSpriteOptions) {
    return this.api.post(`/api/sprite/generate/${projectId}`, options);
  }
}
