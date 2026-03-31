import { TestBed } from '@angular/core/testing';

import { IssueTokenApiService } from './issue-token-api.service';

describe('IssueTokenApiService', () => {
  let service: IssueTokenApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IssueTokenApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
