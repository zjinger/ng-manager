import { TestBed } from '@angular/core/testing';

import { LocalStateStore } from './local-state.store';

describe('LocalStateStore', () => {
  let service: LocalStateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalStateStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
