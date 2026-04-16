import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueFilterBarComponent } from './issue-filter-bar.component';

describe('IssueFilterBarComponent', () => {
  let component: IssueFilterBarComponent;
  let fixture: ComponentFixture<IssueFilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueFilterBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueFilterBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
