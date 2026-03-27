import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdBlockDialogComponent } from './rd-block-dialog.component';

describe('RdBlockDialogComponent', () => {
  let component: RdBlockDialogComponent;
  let fixture: ComponentFixture<RdBlockDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdBlockDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdBlockDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
