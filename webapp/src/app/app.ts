import { Component } from '@angular/core';
import { ProjectIconRegistry } from './icons/project-icon-registry';
import { LayoutComponent } from './layout/layout.component';

@Component({
  selector: 'app-root',
  imports: [LayoutComponent],
  template: `<ngm-layout></ngm-layout>`,
  styles: [
    `:host {
        display: block;
        height: 100vh;
    }`,
  ]
})
export class App {
  constructor(reg: ProjectIconRegistry) {
    reg.init();
  }
}
