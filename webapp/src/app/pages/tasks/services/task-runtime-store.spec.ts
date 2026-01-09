import { TestBed } from '@angular/core/testing';

import { TaskRuntimeStore } from './task-runtime-store';

describe('TaskRuntimeStore', () => {
  let service: TaskRuntimeStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskRuntimeStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
