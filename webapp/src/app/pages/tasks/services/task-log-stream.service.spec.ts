import { TestBed } from '@angular/core/testing';

import { TaskLogStreamService } from './task-log-stream.service';

describe('TaskLogStreamService', () => {
  let service: TaskLogStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskLogStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
