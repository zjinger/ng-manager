import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'ngm-header',
  imports: [],
  templateUrl: './layout-header.component.html',
  styleUrl: './layout-header.component.less',
})
export class LayoutHeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
}
