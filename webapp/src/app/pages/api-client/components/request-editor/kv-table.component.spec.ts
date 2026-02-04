import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KvTableComponent } from './kv-table.component';

describe('KvTableComponent', () => {
  let component: KvTableComponent;
  let fixture: ComponentFixture<KvTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KvTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KvTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
