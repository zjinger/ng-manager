import { TestBed } from '@angular/core/testing';

import { TaskBootstrapServcie } from './task-bootstrap.servcie';

describe('TaskBootstrapServcie', () => {
  let service: TaskBootstrapServcie;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskBootstrapServcie);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
