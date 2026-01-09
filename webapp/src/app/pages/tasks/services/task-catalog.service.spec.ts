import { TestBed } from '@angular/core/testing';

import { TaskCatalogService } from './task-catalog.service';

describe('TaskCatalogService', () => {
  let service: TaskCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskCatalogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
