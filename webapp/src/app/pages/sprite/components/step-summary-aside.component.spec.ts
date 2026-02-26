import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepSummaryAsideComponent } from './step-summary-aside.component';

describe('StepSummaryAsideComponent', () => {
  let component: StepSummaryAsideComponent;
  let fixture: ComponentFixture<StepSummaryAsideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepSummaryAsideComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepSummaryAsideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
