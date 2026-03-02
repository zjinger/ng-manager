import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpriteImagesPanelComponent } from './sprite-images-panel-component';

describe('SpriteImagesPanelComponent', () => {
  let component: SpriteImagesPanelComponent;
  let fixture: ComponentFixture<SpriteImagesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpriteImagesPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpriteImagesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
