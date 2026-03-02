import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpriteViewportComponent } from './sprite-viewport-component';

describe('SpriteViewportComponent', () => {
  let component: SpriteViewportComponent;
  let fixture: ComponentFixture<SpriteViewportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpriteViewportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpriteViewportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
