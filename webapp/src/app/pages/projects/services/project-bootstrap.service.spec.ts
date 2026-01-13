import { TestBed } from '@angular/core/testing';

import { ProjectBootstrapService } from './project-bootstrap.service';

describe('ProjectBootstrapService', () => {
  let service: ProjectBootstrapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectBootstrapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
