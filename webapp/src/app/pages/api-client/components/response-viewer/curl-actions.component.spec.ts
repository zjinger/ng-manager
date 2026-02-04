import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurlActionsComponent } from './curl-actions.component';

describe('CurlActionsComponent', () => {
  let component: CurlActionsComponent;
  let fixture: ComponentFixture<CurlActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurlActionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurlActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
