import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSummaryAsideComponent } from './create-summary-aside.component';

describe('CreateSummaryAsideComponent', () => {
  let component: CreateSummaryAsideComponent;
  let fixture: ComponentFixture<CreateSummaryAsideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSummaryAsideComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateSummaryAsideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
