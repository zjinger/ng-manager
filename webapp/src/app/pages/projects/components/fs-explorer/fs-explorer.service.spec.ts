import { TestBed } from '@angular/core/testing';

import { FsExplorerService } from './fs-explorer.service';

describe('FsExplorerService', () => {
  let service: FsExplorerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FsExplorerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
