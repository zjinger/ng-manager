import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { SpriteSnapshot } from '@models/sprite.model';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { SpriteIconsPanelComponent, SpriteImagesPanelComponent } from './components';

@Component({
  selector: 'app-sprite-result-tabs',
  imports: [
    CommonModule,
    NzTabsModule,
    NzEmptyModule,
    NzSelectModule,
    NzTagModule,
    SpriteImagesPanelComponent,
    SpriteIconsPanelComponent
  ],
  template: `
    <!-- @if(!gen){
      <nz-empty nzNotFoundContent="请先生成雪碧图"></nz-empty>
    } @else { -->
      <nz-tabs [(nzSelectedIndex)]="tabIndex">
        <nz-tab nzTitle="图标">
          <ng-template nz-tab>
            <app-sprite-icons-panel
              [sprite]="sprite()"
            />
          </ng-template>
        </nz-tab>

        <nz-tab nzTitle="图片">
          <ng-template nz-tab>
            <app-sprite-images-panel [sprite]="sprite()"
            />
          </ng-template>
        </nz-tab> 
      </nz-tabs>
    <!-- } -->
  `,
  styles: [
    `
    :host{
      display: block;
      height: 100%;
      nz-tabs{
        height: 100%;
        &::ng-deep .ant-tabs-content-holder{
          height: 100%;
          .ant-tabs-content{
            height: 100%;
            .ant-tabs-tabpane{
              height: 100%;
            }
          }
        }
      }
    }
    `
  ],
})
export class SpriteResultTabsComponent {
  sprite = input<SpriteSnapshot | null>(null);
  tabIndex = 0;
}
