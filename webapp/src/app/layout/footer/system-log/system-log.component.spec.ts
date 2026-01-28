import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemLogDrawerComponent } from './system-log.component';

describe('SystemLogDrawerComponent', () => {
  let component: SystemLogDrawerComponent;
  let fixture: ComponentFixture<SystemLogDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemLogDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemLogDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
