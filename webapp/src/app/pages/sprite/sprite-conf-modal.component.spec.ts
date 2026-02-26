import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpriteConfModalComponent } from './sprite-conf-modal.component';

describe('SpriteConfModalComponent', () => {
  let component: SpriteConfModalComponent;
  let fixture: ComponentFixture<SpriteConfModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpriteConfModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpriteConfModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
