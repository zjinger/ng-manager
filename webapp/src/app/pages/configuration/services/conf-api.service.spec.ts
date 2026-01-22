import { TestBed } from '@angular/core/testing';

import { ConfApiService } from './conf-api.service';

describe('ConfApiService', () => {
  let service: ConfApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
