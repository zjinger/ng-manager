import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectItem } from './project-item.component';

describe('ProjectItem', () => {
  let component: ProjectItem;
  let fixture: ComponentFixture<ProjectItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
