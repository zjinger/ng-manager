import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnvModalComponent } from './env-modal.component';

describe('EnvModalComponent', () => {
  let component: EnvModalComponent;
  let fixture: ComponentFixture<EnvModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnvModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
