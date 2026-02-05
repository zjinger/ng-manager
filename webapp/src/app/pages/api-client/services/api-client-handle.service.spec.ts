import { TestBed } from '@angular/core/testing';

import { ApiClientHandleService } from './api-client-handle.service';

describe('ApiClientHandleService', () => {
  let service: ApiClientHandleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiClientHandleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
