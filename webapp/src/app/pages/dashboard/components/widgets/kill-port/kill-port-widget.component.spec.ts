import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KillPortWidgetComponent } from './kill-port-widget.component';

describe('KillPortWidgetComponent', () => {
  let component: KillPortWidgetComponent;
  let fixture: ComponentFixture<KillPortWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KillPortWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KillPortWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
