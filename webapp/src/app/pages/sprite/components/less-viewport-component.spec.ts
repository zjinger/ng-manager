import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessViewportComponent } from './less-viewport-component';

describe('LessViewportComponent', () => {
  let component: LessViewportComponent;
  let fixture: ComponentFixture<LessViewportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessViewportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessViewportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
