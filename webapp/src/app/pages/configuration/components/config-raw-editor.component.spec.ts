import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigRawEditorComponent } from './config-raw-editor.component';

describe('ConfigRawEditorComponent', () => {
  let component: ConfigRawEditorComponent;
  let fixture: ComponentFixture<ConfigRawEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigRawEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigRawEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 'A=1\n\nB=2\n');
    fixture.detectChanges();
  });

  it('preserves line breaks and blank lines', () => {
    expect(component.textValue).toBe('A=1\n\nB=2\n');
  });

  it('does not emit changes while readonly', () => {
    const emitted: string[] = [];
    component.valueChange.subscribe((value) => emitted.push(value));
    component.readonly = true;

    component.onTextChange('A=2');

    expect(emitted).toEqual([]);
  });
});
