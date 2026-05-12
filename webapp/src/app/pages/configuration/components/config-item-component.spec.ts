import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigItemComponent } from './config-item-component';

describe('ConfigItemComponent', () => {
  let component: ConfigItemComponent;
  let fixture: ComponentFixture<ConfigItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigItemComponent);
    component = fixture.componentInstance;
    component.item = {
      key: 'name',
      label: 'Name',
      type: 'text',
      path: '/name',
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses summary for dependency fields', () => {
    component.item = {
      key: 'devDependencies',
      label: 'Dev Dependencies',
      type: 'json',
      path: '/devDependencies',
    };

    expect(component.shouldUseSummary({ '@angular/core': '^20.0.0' }, component.item)).toBeTrue();
  });

  it('uses summary for large objects and arrays', () => {
    component.item = {
      key: 'paths',
      label: 'Paths',
      type: 'json',
      path: '/compilerOptions/paths',
    };

    expect(component.shouldUseSummary({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9 }, component.item)).toBeTrue();
    expect(component.shouldUseSummary([1, 2, 3, 4, 5, 6, 7], component.item)).toBeTrue();
  });
});
