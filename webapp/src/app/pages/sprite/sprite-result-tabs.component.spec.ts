import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpriteResultTabsComponent } from './sprite-result-tabs.component';

describe('SpriteResultTabsComponent', () => {
  let component: SpriteResultTabsComponent;
  let fixture: ComponentFixture<SpriteResultTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpriteResultTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpriteResultTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
