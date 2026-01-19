import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCanvasComponent } from './dashboard-canvas.component';

describe('DashboardCanvasComponent', () => {
  let component: DashboardCanvasComponent;
  let fixture: ComponentFixture<DashboardCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCanvasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
