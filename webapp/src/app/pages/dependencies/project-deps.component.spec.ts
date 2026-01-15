import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectDepsComponent } from './project-deps.component';

describe('ProjectDepsComponent', () => {
  let component: ProjectDepsComponent;
  let fixture: ComponentFixture<ProjectDepsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDepsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectDepsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
