import { TestBed } from '@angular/core/testing';

import { TasksFacadeService } from './tasks.facade.service';

describe('TasksFacadeService', () => {
  let service: TasksFacadeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TasksFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
