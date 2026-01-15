import { TestBed } from '@angular/core/testing';

import { DepsApiService } from './deps-api.service';

describe('DepsApiService', () => {
  let service: DepsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DepsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
