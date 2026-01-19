import { TestBed } from '@angular/core/testing';

import { DashboardLayoutService } from './dashboard-layout.service';

describe('DashboardLayoutService', () => {
  let service: DashboardLayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardLayoutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
