import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectCreateModal } from './project-create-modal.component';

describe('ProjectCreateModal', () => {
  let component: ProjectCreateModal;
  let fixture: ComponentFixture<ProjectCreateModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCreateModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectCreateModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
