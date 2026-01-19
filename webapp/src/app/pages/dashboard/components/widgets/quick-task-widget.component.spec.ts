import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuickTaskWidgetComponent } from './quick-task-widget.component';

describe('QuickTaskWidgetComponent', () => {
  let component: QuickTaskWidgetComponent;
  let fixture: ComponentFixture<QuickTaskWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickTaskWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuickTaskWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
