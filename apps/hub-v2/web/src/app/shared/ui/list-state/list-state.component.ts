import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';

@Component({
  selector: 'app-list-state',
  standalone: true,
  imports: [EmptyStateComponent, LoadingStateComponent],
  template: `
    @if (loading()) {
      <app-loading-state [text]="loadingText()" />
    } @else if (empty()) {
      <app-empty-state [title]="emptyTitle()" [description]="emptyDescription()" />
    } @else {
      <ng-content></ng-content>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListStateComponent {
  readonly loading = input(false);
  readonly empty = input(false);
  readonly loadingText = input('正在加载…');
  readonly emptyTitle = input('暂无数据');
  readonly emptyDescription = input('');
}
