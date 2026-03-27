import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdAdvanceStageDialogComponent } from './rd-advance-stage-dialog.component';

describe('RdAdvanceStageDialogComponent', () => {
  let component: RdAdvanceStageDialogComponent;
  let fixture: ComponentFixture<RdAdvanceStageDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdAdvanceStageDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdAdvanceStageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
