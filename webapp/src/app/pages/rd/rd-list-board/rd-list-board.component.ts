import { Component, computed, input, output } from '@angular/core';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { RdItemCardComponent } from '../rd-item-card/rd-item-card.component';
import { ProjectMemberEntity, RdItemEntity, RdStageEntity } from '../models/rd.model';
import { parseDescriptionImage } from '@app/utils/md-text';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

const PRIORITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

@Component({
  selector: 'app-rd-list-board',
  imports: [NzCardModule, NzBadgeModule, NzTagModule, RdItemCardComponent, NzEmptyModule],
  template: `
    <div class="cards-list">
      @if (rdItems().length > 0) {
        @for (stage of stages(); track stage.id) {
          <nz-card [nzTitle]="cardTitleTpl" class="items-card">
            @for (item of itemGroupByStages().get(stage.id); track item.id) {
              <app-rd-item-card
                [rdItem]="item"
                [stages]="stages()"
                (selectItem)="select($event)"
                [selected]="selectedItem()?.id === item.id"
                [projectId]="projectId()"
                [projectMembers]="members()"
              />
            } @empty {
              <nz-empty />
            }
          </nz-card>
          <ng-template #cardTitleTpl>
            <div class="card-title">
              <span>{{ getStagesName(stage.id) }}</span>
              <nz-badge
                nzStandalone
                nzShowZero
                [nzColor]="'#eee'"
                [nzCount]="itemGroupByStages().get(stage.id)?.length ?? 0"
              />
            </div>
          </ng-template>
        }
      }
    </div>
  `,
  styles: `
    .cards-list {
      .items-card {
        flex-grow: 1;
        overflow: hidden;
      }

      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      .card-title {
        width: 100%;
        display: flex;
        align-items: center;
        span {
          margin-right: auto;
        }
      }
    }
    .rd-title {
      color: #1677ff;
      font-weight: 500;
      cursor: pointer;
    }
    :host ::ng-deep .ant-card-head {
      height: 48px;
      padding: 0 12px;
    }

    :host ::ng-deep .ant-card-head-title {
      padding: 10px 0;
    }

    :host ::ng-deep .ant-card-body {
      display: flex;
      flex-direction: column;
      gap: 10px;

      overflow: auto;
      padding: 0 12px;
    }

    :host ::ng-deep .ant-card-bordered {
      border: 1px solid #e7e7e7;
      border-radius: 8px;
    }
  `,
})
export class RdListBoardComponent {
  readonly rdItems = input<RdItemEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly selectedItem = input<RdItemEntity | null>(null);
  readonly projectId = input<string | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  selectItem = output<RdItemEntity>();

  itemGroupByStages = computed(() => {
    const map = new Map<string, any[]>();
    for (const item of this.rdItems()) {
      const key = item.stageId;
      if (!key) {
        continue;
      }
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

  getStagesName(stageId: string | null) {
    if (!stageId) return '';
    const stage = this.stages().find((stage) => {
      return stage.id === stageId;
    });
    return stage?.name ?? '';
  }
}
