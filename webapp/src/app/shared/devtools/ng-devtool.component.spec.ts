import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgDevtoolComponent } from './ng-devtool.component';

describe('NgDevtoolComponent', () => {
  let component: NgDevtoolComponent;
  let fixture: ComponentFixture<NgDevtoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgDevtoolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgDevtoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
