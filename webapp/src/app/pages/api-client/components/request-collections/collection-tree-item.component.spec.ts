import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionTreeItemComponent } from './collection-tree-item.component';

describe('CollectionTreeItemComponent', () => {
  let component: CollectionTreeItemComponent;
  let fixture: ComponentFixture<CollectionTreeItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionTreeItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionTreeItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
