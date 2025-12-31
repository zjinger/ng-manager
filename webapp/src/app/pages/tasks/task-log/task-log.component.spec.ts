import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskLogDrawerComponent } from './task-log.component';

describe('TaskLogDrawerComponent', () => {
  let component: TaskLogDrawerComponent;
  let fixture: ComponentFixture<TaskLogDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskLogDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskLogDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
