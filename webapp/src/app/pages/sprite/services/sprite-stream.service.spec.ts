import { TestBed } from '@angular/core/testing';

import { SpriteStreamService } from './sprite-stream.service';

describe('SpriteStreamService', () => {
  let service: SpriteStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpriteStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
