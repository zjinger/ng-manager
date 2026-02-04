import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnvPickerComponent } from './env-picker.component';

describe('EnvPickerComponent', () => {
  let component: EnvPickerComponent;
  let fixture: ComponentFixture<EnvPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnvPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
