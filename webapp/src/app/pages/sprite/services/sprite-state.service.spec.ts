import { TestBed } from '@angular/core/testing';

import { SpriteStateService } from './sprite-state.service';

describe('SpriteStateService', () => {
  let service: SpriteStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpriteStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
