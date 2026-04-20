import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdStageHistoryComponent } from './rd-stage-history.component';

describe('RdStageHistoryComponent', () => {
  let component: RdStageHistoryComponent;
  let fixture: ComponentFixture<RdStageHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdStageHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdStageHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
