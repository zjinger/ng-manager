import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodyEditorComponent } from './body-editor.component';

describe('BodyEditorComponent', () => {
  let component: BodyEditorComponent;
  let fixture: ComponentFixture<BodyEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BodyEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BodyEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
