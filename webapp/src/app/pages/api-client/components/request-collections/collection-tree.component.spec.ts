import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionTreeComponent } from './collection-tree.component';

describe('CollectionTreeComponent', () => {
  let component: CollectionTreeComponent;
  let fixture: ComponentFixture<CollectionTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionTreeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
