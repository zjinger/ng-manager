import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskStatusBadgeComponent } from './task-status-badge.component';

describe('TaskStatusBadgeComponent', () => {
  let component: TaskStatusBadgeComponent;
  let fixture: ComponentFixture<TaskStatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskStatusBadgeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskStatusBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
