import { Component, effect, ElementRef, input, ViewChild } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { CommonModule } from '@angular/common';

export interface ScrollableTableListColumn {
  title: string;
  width?: number | string;
  ellipsis?: boolean;
}

/**
 * 一个基于 ng-zorro Table 的固定表头「可滚动表格容器组件」
 * - 提供容器级滚动（有父容器包裹时，超出容器出现滚动条）
 * - 使用 <tr class="selected"> 标记选中行
 *
 * @Input columns: ScrollableTableColumn[]
 * - 表头配置
 * - title: 表头文本
 * - width: 列宽（可选）
 * - ellipsis: 是否省略（可选）
 *
 * @Input refreshKey: any
 * - 用于触发滚动条重置的信号
 * - 当该值发生变化时，滚动容器自动 scrollTop = 0
 * - 推荐传入：
 *   - 分页参数（query）
 *   - 数据源引用（如新数组）
 *
 * @input loading: boolean
 * - 是否加载中
 */
@Component({
  selector: 'app-scrollable-table-list',
  standalone: true,
  imports: [NzTableModule, CommonModule],
  template: `
    <div class="scrollable-table" #container>
      <nz-table
        nzTableLayout="fixed"
        [nzData]="data()"
        [nzFrontPagination]="false"
        [nzShowPagination]="false"
        [nzLoading]="loading()"
        class="table"
      >
        <thead>
          <tr>
            @for (col of columns(); track col.title) {
              <th [nzWidth]="getColumnWidth(col.width)" [nzEllipsis]="col.ellipsis || false">
                {{ col.title }}
              </th>
            }
          </tr>
        </thead>

        <!-- 传入的tr使用class.selected属性标记选中 -->
        <tbody class="table-body">
          <ng-content></ng-content>
        </tbody>
      </nz-table>
    </div>
  `,
  styles: [
    `
      .scrollable-table {
        width: 100%;
        height: 100%;
        min-height: 0;

        border-radius: 8px;
        border: 1px solid #f0f0f0;

        overflow: auto;

        /* 滚动条统一风格 */
        &::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        &::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 3px;
        }

        &::-webkit-scrollbar-thumb {
          background: #d9d9d9;
          border-radius: 3px;

          &:hover {
            background: #bfbfbf;
          }
        }
      }

      ::ng-deep .table-body > tr {
        cursor: pointer;

        &:hover > td {
          background-color: #f5f5f5;
        }
        &.selected > td:first-child {
          border-left: 4px solid #91d5ff;
        }

        &.selected:hover > td {
          background-color: #e6f7ff;
        }

        &.selected > td {
          background-color: #e6f7ff;
        }
      }

      // 空状态时去除ng-zorro的原边框
      ::ng-deep .nz-disable-td.ant-table-cell {
        border-bottom: 0;
      }
      // 表头固定
      ::ng-deep .ant-table-thead.ng-star-inserted {
        position: sticky;
        top: 0;
        z-index: 100;
      }
    `,
  ],
})
export class ScrollableTableListComponent {
  readonly data = input<any[]>([]);
  readonly columns = input<ScrollableTableListColumn[]>([]);
  readonly loading = input(false);

  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  constructor() {
    let prev = this.data();
    effect(() => {
      const current = this.data();
      if (current === prev) return;

      prev = current;
      requestAnimationFrame(() => {
        this.container.nativeElement.scrollTop = 0;
      });
    });
  }

  getColumnWidth(width: number | string | undefined): string {
    if (width === undefined) return 'auto';
    if (width === '') return '';
    return typeof width === 'number' ? `${width}px` : width;
  }
}
