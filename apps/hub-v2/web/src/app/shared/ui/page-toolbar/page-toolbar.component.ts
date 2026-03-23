import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-page-toolbar',
  standalone: true,
  template: `
    <section class="page-toolbar">
      <div class="page-toolbar__start">
        <ng-content select="[toolbar-primary]"></ng-content>
        <ng-content select="[toolbar-filters]"></ng-content>
      </div>

      <div class="page-toolbar__end">
        <ng-content select="[toolbar-search]"></ng-content>
        <ng-content select="[toolbar-actions]"></ng-content>
      </div>
    </section>
  `,
  styles: [
    `
      .page-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        padding: 4px 0 2px;
      }

      .page-toolbar__start,
      .page-toolbar__end {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .page-toolbar__start {
        flex: 1 1 auto;
      }

      .page-toolbar__end {
        flex: 1 1 320px;
        justify-content: flex-end;
      }

      @media (max-width: 920px) {
        .page-toolbar {
          gap: 14px;
        }
        .page-toolbar__end {
          justify-content: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageToolbarComponent {}
