import { Component, signal } from '@angular/core';
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
  protected readonly title = signal('Ng-Manager');
}
