import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomIconRegistry } from '@core/icons';
import { AppUpdateService } from '@core/update/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {
  private readonly iconRegistry = inject(CustomIconRegistry);
  private readonly appUpdate = inject(AppUpdateService);

  constructor() {
    this.iconRegistry.init();
    this.appUpdate.start();
  }
}
