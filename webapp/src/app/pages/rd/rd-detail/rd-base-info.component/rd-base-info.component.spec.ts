import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdBaseInfoComponent } from './rd-base-info.component';

describe('RdBaseInfoComponent', () => {
  let component: RdBaseInfoComponent;
  let fixture: ComponentFixture<RdBaseInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdBaseInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdBaseInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
