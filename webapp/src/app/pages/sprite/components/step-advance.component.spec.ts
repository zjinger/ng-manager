import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepAdvanceComponent } from './step-advance.component';

describe('StepAdvanceComponent', () => {
  let component: StepAdvanceComponent;
  let fixture: ComponentFixture<StepAdvanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepAdvanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepAdvanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
