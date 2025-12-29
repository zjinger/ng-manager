import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutRightPanelComponent } from './layout-right-panel.component';

describe('LayoutRightPanelComponent', () => {
  let component: LayoutRightPanelComponent;
  let fixture: ComponentFixture<LayoutRightPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutRightPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutRightPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
