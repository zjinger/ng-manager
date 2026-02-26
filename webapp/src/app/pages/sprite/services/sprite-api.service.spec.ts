import { TestBed } from '@angular/core/testing';

import { SpriteApiService } from './sprite-api.service';

describe('SpriteApiService', () => {
  let service: SpriteApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpriteApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
