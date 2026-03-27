import { TestBed } from '@angular/core/testing';

import { RdApiService } from './rd-api.service';

describe('RdApiService', () => {
  let service: RdApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
