import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdProgressAreaComponent } from './rd-progress-area.component';

describe('RdProgressAreaComponent', () => {
  let component: RdProgressAreaComponent;
  let fixture: ComponentFixture<RdProgressAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdProgressAreaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdProgressAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
