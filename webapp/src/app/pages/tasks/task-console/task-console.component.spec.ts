import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskConsoleComponent } from './task-console.component';

describe('TaskConsoleComponent', () => {
  let component: TaskConsoleComponent;
  let fixture: ComponentFixture<TaskConsoleComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskConsoleComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TaskConsoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
