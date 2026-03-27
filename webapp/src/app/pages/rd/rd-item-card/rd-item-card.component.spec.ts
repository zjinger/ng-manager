import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdItemCardComponent } from './rd-item-card.component';

describe('RdItemCardComponent', () => {
  let component: RdItemCardComponent;
  let fixture: ComponentFixture<RdItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdItemCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdItemCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
