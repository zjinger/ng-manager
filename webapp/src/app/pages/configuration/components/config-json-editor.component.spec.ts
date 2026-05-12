import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfigJsonEditorComponent } from './config-json-editor.component';

describe('ConfigJsonEditorComponent', () => {
  let component: ConfigJsonEditorComponent;
  let fixture: ComponentFixture<ConfigJsonEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigJsonEditorComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigJsonEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', { start: 'ng serve' });
    fixture.detectChanges();
  });

  it('does not emit a value when edited JSON is invalid', () => {
    const emitted: unknown[] = [];
    component.valueChange.subscribe((value) => emitted.push(value));

    component.onTextChange('{');

    expect(emitted).toEqual([]);
    expect(component.errorMessage).toContain('JSON');
  });

  it('emits parsed JSON when edited JSON is valid', () => {
    const emitted: unknown[] = [];
    component.valueChange.subscribe((value) => emitted.push(value));

    component.onTextChange('{"build":"ng build"}');

    expect(emitted).toEqual([{ build: 'ng build' }]);
  });
});
