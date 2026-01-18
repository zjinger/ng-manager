import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectConfComponent } from './project-conf.component';

describe('ProjectConfComponent', () => {
  let component: ProjectConfComponent;
  let fixture: ComponentFixture<ProjectConfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectConfComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectConfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
