import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueAttachmentAreaComponent } from './issue-attachment-area.component';

describe('IssueAttachmentAreaComponent', () => {
  let component: IssueAttachmentAreaComponent;
  let fixture: ComponentFixture<IssueAttachmentAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueAttachmentAreaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueAttachmentAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
