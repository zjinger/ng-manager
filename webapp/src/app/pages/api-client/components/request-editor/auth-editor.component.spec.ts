import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthEditorComponent } from './auth-editor.component';

describe('AuthEditorComponent', () => {
  let component: AuthEditorComponent;
  let fixture: ComponentFixture<AuthEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
