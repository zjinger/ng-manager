import { TestBed } from '@angular/core/testing';

import { WsClientService } from './ws-client.service';

describe('WsClientService', () => {
  let service: WsClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WsClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
