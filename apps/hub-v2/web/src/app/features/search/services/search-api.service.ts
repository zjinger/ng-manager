import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import type { SearchEntityType, SearchResult } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  private readonly api = inject(ApiClientService);

  search(input: {
    q: string;
    types?: SearchEntityType[];
    limit?: number;
  }) {
    return this.api.get<SearchResult>('/search', {
      q: input.q,
      types: input.types && input.types.length > 0 ? input.types.join(',') : undefined,
      limit: input.limit ?? 20,
    });
  }
}
