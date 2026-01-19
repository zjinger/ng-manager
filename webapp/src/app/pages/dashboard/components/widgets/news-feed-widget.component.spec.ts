import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsFeedWidgetComponent } from './news-feed-widget.component';

describe('NewsFeedWidgetComponent', () => {
  let component: NewsFeedWidgetComponent;
  let fixture: ComponentFixture<NewsFeedWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsFeedWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsFeedWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
