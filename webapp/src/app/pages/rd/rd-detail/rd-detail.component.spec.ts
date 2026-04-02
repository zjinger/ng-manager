import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdDetailComponent } from './rd-detail.component';

describe('RdDetailComponent', () => {
  let component: RdDetailComponent;
  let fixture: ComponentFixture<RdDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
