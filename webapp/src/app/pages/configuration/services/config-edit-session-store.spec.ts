import { TestBed } from '@angular/core/testing';

import { ConfigEditSessionStore } from './config-edit-session-store';

describe('ConfigEditSessionStore', () => {
  let service: ConfigEditSessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigEditSessionStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
