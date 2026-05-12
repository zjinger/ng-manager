import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigNavComponent } from './config-nav-component';

describe('ConfigNavComponent', () => {
  let component: ConfigNavComponent;
  let fixture: ComponentFixture<ConfigNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigNavComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ConfigNavComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('nodes', [
      {
        id: 'package-json',
        type: 'provider',
        label: 'Package',
        available: true,
        files: [{ filePath: 'package.json', title: 'package.json' }],
        fileCount: 1,
      },
      {
        id: 'tsconfig',
        type: 'provider',
        label: 'TypeScript',
        available: true,
        files: [
          { filePath: 'tsconfig.json', title: 'tsconfig.json' },
          { filePath: 'tsconfig.app.json', title: 'tsconfig.app.json' },
        ],
        fileCount: 2,
      },
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits documentSelect with first file for single-file providers', () => {
    const emitted: Array<{ type: string; filePath?: string }> = [];
    component.documentSelect.subscribe((event) => emitted.push(event));

    component.selectProvider(component.nodes()[0]);

    expect(emitted).toEqual([{ type: 'package-json', filePath: 'package.json' }]);
  });

  it('expands multi-file providers and emits selected file path', () => {
    const emitted: Array<{ type: string; filePath?: string }> = [];
    component.documentSelect.subscribe((event) => emitted.push(event));
    const node = component.nodes()[1];

    component.selectProvider(node);
    component.selectFile(node, node.files![1], new MouseEvent('click'));

    expect(component.isExpanded(node)).toBeTrue();
    expect(emitted).toEqual([{ type: 'tsconfig', filePath: 'tsconfig.app.json' }]);
  });

  it('filters providers by file path', () => {
    component.keyword.set('app');

    expect(component.filtered().map((item) => item.id)).toEqual(['tsconfig']);
  });
});
