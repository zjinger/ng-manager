import { TestBed } from '@angular/core/testing';

import { ProjectImportStateService } from './project-import.state.service';

describe('ProjectImportStateService', () => {
  let service: ProjectImportStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectImportStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
