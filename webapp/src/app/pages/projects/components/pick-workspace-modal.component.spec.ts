import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickWorkspaceModalComponent } from './pick-workspace-modal.component';

describe('PickWorkspaceModalComponent', () => {
  let component: PickWorkspaceModalComponent;
  let fixture: ComponentFixture<PickWorkspaceModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PickWorkspaceModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PickWorkspaceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
