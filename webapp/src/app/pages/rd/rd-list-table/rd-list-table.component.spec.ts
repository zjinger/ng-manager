import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdListTableComponent } from './rd-list-table.component';

describe('RdListTableComponent', () => {
  let component: RdListTableComponent;
  let fixture: ComponentFixture<RdListTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdListTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdListTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
