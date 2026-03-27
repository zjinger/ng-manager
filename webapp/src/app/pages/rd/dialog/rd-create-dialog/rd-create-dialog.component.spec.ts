import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdCreateDialogComponent } from './rd-create-dialog.component';

describe('RdCreateDialogComponent', () => {
  let component: RdCreateDialogComponent;
  let fixture: ComponentFixture<RdCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdCreateDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
