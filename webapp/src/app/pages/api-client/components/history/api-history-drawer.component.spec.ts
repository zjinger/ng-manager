import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiHistoryDrawerComponent } from './api-history-drawer.component';

describe('ApiHistoryDrawerComponent', () => {
  let component: ApiHistoryDrawerComponent;
  let fixture: ComponentFixture<ApiHistoryDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiHistoryDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApiHistoryDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
