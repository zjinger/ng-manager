import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponseViewerComponent } from './response-viewer.component';

describe('ResponseViewerComponent', () => {
  let component: ResponseViewerComponent;
  let fixture: ComponentFixture<ResponseViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponseViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResponseViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
