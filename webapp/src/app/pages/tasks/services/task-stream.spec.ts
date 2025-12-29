import { TestBed } from '@angular/core/testing';

import { TaskStreamService } from './task-stream.service';

describe('TaskStreamService', () => {
  let service: TaskStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
