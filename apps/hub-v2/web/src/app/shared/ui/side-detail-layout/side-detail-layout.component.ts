import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-side-detail-layout',
  standalone: true,
  template: `
    <div class="detail-layout" [class.is-static-side]="staticSide()">
      <div class="detail-layout__main">
        <ng-content select="[detail-main]"></ng-content>
      </div>

      <div class="detail-layout__side">
        <ng-content select="[detail-side]"></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .detail-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.85fr);
        gap: 20px;
        // align-items: start;
      }

      .detail-layout__main,
      .detail-layout__side {
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-width: 0;
      }

      .detail-layout__side {
        position: sticky;
        top: 88px;
      }

      .detail-layout.is-static-side .detail-layout__side {
        position: static;
      }

      @media (max-width: 1100px) {
        .detail-layout {
          grid-template-columns: 1fr;
        }
        .detail-layout__side {
          position: static;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideDetailLayoutComponent {
  readonly staticSide = input(false);
}
