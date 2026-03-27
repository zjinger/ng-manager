import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdListBoardComponent } from './rd-list-board.component';

describe('RdListBoardComponent', () => {
  let component: RdListBoardComponent;
  let fixture: ComponentFixture<RdListBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdListBoardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdListBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
