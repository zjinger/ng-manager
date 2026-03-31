import { TestBed } from '@angular/core/testing';

import { IssueApiService } from './issue-api.service';

describe('IssueApiService', () => {
  let service: IssueApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IssueApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
