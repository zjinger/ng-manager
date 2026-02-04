import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestUrlbarComponent } from './request-urlbar.component';

describe('RequestUrlbarComponent', () => {
  let component: RequestUrlbarComponent;
  let fixture: ComponentFixture<RequestUrlbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestUrlbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestUrlbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
