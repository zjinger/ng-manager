import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpriteIconsPanelComponent } from './sprite-icons-panel-component';

describe('SpriteIconsPanelComponent', () => {
  let component: SpriteIconsPanelComponent;
  let fixture: ComponentFixture<SpriteIconsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpriteIconsPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpriteIconsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
