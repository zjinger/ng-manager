import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepPresetComponent } from './step-preset.component';

describe('StepPresetComponent', () => {
  let component: StepPresetComponent;
  let fixture: ComponentFixture<StepPresetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepPresetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepPresetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
