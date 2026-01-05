import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FsExplorerComponent } from './fs-explorer.component';

describe('FsExplorerComponent', () => {
  let component: FsExplorerComponent;
  let fixture: ComponentFixture<FsExplorerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FsExplorerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FsExplorerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
