import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdFilterBarComponent } from './rd-filter-bar.component';

describe('RdFilterBarComponent', () => {
  let component: RdFilterBarComponent;
  let fixture: ComponentFixture<RdFilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdFilterBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdFilterBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
