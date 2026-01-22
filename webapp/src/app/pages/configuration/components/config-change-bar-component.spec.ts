import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigChangeBarComponent } from './config-change-bar-component';

describe('ConfigChangeBarComponent', () => {
  let component: ConfigChangeBarComponent;
  let fixture: ComponentFixture<ConfigChangeBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigChangeBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigChangeBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
