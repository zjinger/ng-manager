import { TestBed } from '@angular/core/testing';

import { ConfigClientService } from './config-client.service';

describe('ConfigClientService', () => {
  let service: ConfigClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
