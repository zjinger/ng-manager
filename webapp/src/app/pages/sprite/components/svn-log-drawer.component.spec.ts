import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SvnLogDrawerComponent } from './svn-log-drawer.component';

describe('SvnLogDrawerComponent', () => {
  let component: SvnLogDrawerComponent;
  let fixture: ComponentFixture<SvnLogDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SvnLogDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SvnLogDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
