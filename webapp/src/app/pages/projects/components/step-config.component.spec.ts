import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepConfigComponent } from './step-config.component';

describe('StepConfigComponent', () => {
  let component: StepConfigComponent;
  let fixture: ComponentFixture<StepConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
