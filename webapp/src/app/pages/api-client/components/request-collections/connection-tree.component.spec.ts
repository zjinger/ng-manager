import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectionTreeComponent } from './connection-tree.component';

describe('ConnectionTreeComponent', () => {
  let component: ConnectionTreeComponent;
  let fixture: ComponentFixture<ConnectionTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionTreeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConnectionTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
