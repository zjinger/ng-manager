import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueActionAreaComponent } from './issue-action-area.component';

describe('IssueActionAreaComponent', () => {
  let component: IssueActionAreaComponent;
  let fixture: ComponentFixture<IssueActionAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueActionAreaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueActionAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
