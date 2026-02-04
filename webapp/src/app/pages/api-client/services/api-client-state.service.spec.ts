import { TestBed } from '@angular/core/testing';

import { ApiClientStateService } from './api-client-state.service';

describe('ApiClientStateService', () => {
  let service: ApiClientStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiClientStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
