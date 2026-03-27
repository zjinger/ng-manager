import { Component, computed, input, output } from '@angular/core';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { RdItemCardComponent } from '../rd-item-card/rd-item-card.component';
import { RdItemEntity } from '../models/rd.model';

const PRIORITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

@Component({
  selector: 'app-rd-list-board',
  imports: [NzCardModule, NzBadgeModule, NzTagModule, RdItemCardComponent],
  templateUrl: './rd-list-board.component.html',
  styleUrl: './rd-list-board.component.less',
})
export class RdListBoardComponent {
  readonly rdItems = input<RdItemEntity[]>([]);
  readonly selectedItem = input<RdItemEntity>();
  selectItem = output<RdItemEntity>();

  listCards = [
    {
      key: 'todo',
      title: '待开始',
      color: '#d9d9d9',
    },
    {
      key: 'doing',
      title: '进行中',
      color: '#1890ff',
    },
    {
      key: 'blocked',
      title: '阻塞',
      color: '#ef7735',
    },
    {
      key: 'done',
      title: '待验收',
      color: '#52c41a',
    },
  ];

  // TODO：后面可以改成按照stage分组
  ItemsGroupedByStatus = computed(() => {
    const map = new Map<string, any[]>();
    for (const item of this.rdItems()) {
      const key = item.status;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    // 对每个分组内部排序（高 -> 低）
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] -
          PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER],
      );
    }
    return map;
  });

  select(item: RdItemEntity) {
    this.selectItem.emit(item);
  }
}
