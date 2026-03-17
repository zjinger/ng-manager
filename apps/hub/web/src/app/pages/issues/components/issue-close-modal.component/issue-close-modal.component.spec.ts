import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueCloseModalComponent } from './issue-close-modal.component';

describe('IssueCloseModalComponent', () => {
  let component: IssueCloseModalComponent;
  let fixture: ComponentFixture<IssueCloseModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueCloseModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueCloseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
