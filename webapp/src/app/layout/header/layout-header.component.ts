import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ThemeService } from '@app/theme.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';

@Component({
  selector: 'ngm-header',
  imports: [NzLayoutModule, NzButtonModule, NzIconModule],
  templateUrl: './layout-header.component.html',
  styleUrl: './layout-header.component.less',
})
export class LayoutHeaderComponent {
  @Input() isCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  constructor(private themeService: ThemeService) { }

  toggleTheme() {
    this.themeService.toggleTheme().then();
  }
}
