import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueBranchesComponent } from './issue-branches.component';

describe('IssueBranchesComponent', () => {
  let component: IssueBranchesComponent;
  let fixture: ComponentFixture<IssueBranchesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueBranchesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueBranchesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
