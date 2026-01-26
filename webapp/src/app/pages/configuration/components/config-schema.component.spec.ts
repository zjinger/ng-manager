import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigSchemaComponent } from './config-schema.component';

describe('ConfigSchemaComponent', () => {
  let component: ConfigSchemaComponent;
  let fixture: ComponentFixture<ConfigSchemaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigSchemaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigSchemaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
