import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssuesListTableComponent } from './issues-list-table.component';

describe('IssuesListTableComponent', () => {
  let component: IssuesListTableComponent;
  let fixture: ComponentFixture<IssuesListTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuesListTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssuesListTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
