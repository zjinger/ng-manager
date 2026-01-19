import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddWidgetDrawerComponent } from './add-widget-drawer.component';

describe('AddWidgetDrawerComponent', () => {
  let component: AddWidgetDrawerComponent;
  let fixture: ComponentFixture<AddWidgetDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddWidgetDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddWidgetDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
