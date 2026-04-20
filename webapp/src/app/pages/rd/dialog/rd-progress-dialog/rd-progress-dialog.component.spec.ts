import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdProgressDialogComponent } from './rd-progress-dialog.component';

describe('RdProgressDialogComponent', () => {
  let component: RdProgressDialogComponent;
  let fixture: ComponentFixture<RdProgressDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdProgressDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdProgressDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
