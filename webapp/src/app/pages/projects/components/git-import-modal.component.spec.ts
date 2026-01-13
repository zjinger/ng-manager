import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GitImportModalComponent } from './git-import-modal.component';

describe('GitImportModalComponent', () => {
  let component: GitImportModalComponent;
  let fixture: ComponentFixture<GitImportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GitImportModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GitImportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
