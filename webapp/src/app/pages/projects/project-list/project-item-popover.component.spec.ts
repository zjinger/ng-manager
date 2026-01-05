import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectItemPopoverComponent } from './project-item-popover.component';

describe('ProjectItemPopoverComponent', () => {
  let component: ProjectItemPopoverComponent;
  let fixture: ComponentFixture<ProjectItemPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectItemPopoverComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectItemPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
