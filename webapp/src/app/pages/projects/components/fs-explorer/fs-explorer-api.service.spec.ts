import { TestBed } from '@angular/core/testing';

import { FsExplorerApiService } from './fs-explorer-api.service';

describe('FsExplorerApiService', () => {
  let service: FsExplorerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FsExplorerApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
