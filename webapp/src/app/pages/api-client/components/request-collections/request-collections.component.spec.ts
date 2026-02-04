import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestCollectionsComponent } from './request-collections.component';

describe('RequestCollectionsComponent', () => {
  let component: RequestCollectionsComponent;
  let fixture: ComponentFixture<RequestCollectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestCollectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestCollectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
