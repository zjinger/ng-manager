import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigDomainDocsComponent } from './config-domain-docs.component';

describe('ConfigDomainDocsComponent', () => {
  let component: ConfigDomainDocsComponent;
  let fixture: ComponentFixture<ConfigDomainDocsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigDomainDocsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigDomainDocsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
