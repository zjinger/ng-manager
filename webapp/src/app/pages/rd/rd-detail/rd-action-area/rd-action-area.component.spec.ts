import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdActionAreaComponent } from './rd-action-area.component';

describe('RdActionAreaComponent', () => {
  let component: RdActionAreaComponent;
  let fixture: ComponentFixture<RdActionAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdActionAreaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdActionAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
