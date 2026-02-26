import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepBasicComponent } from './step-basic.component';

describe('StepBasicComponent', () => {
  let component: StepBasicComponent;
  let fixture: ComponentFixture<StepBasicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepBasicComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepBasicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
