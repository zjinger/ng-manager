import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutProjectNavComponent } from './layout-project-nav.component';

describe('LayoutProjectNavComponent', () => {
  let component: LayoutProjectNavComponent;
  let fixture: ComponentFixture<LayoutProjectNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutProjectNavComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutProjectNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
