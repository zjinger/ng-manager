import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-dialog-shell',
  standalone: true,
  imports: [NzModalModule, NzButtonModule, NzIconModule],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzFooter]="null"
      [nzWidth]="width()"
      [nzClosable]="false"
      [nzClassName]="resolvedModalClass()"
      (nzOnCancel)="cancel.emit()"
    >
      <ng-container *nzModalContent>
        <div class="dialog-shell__header">
          <div class="dialog-shell__heading">
            <h2>
              @if (icon()) {
                <span nz-icon [nzType]="icon()!"></span>
              }
              {{ title() }}
            </h2>
            @if (subtitle()) {
              <p>{{ subtitle() }}</p>
            }
          </div>
          <button class="dialog-shell__close" type="button" (click)="cancel.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>

        <div class="dialog-shell__body">
          <ng-content select="[dialog-body]"></ng-content>
        </div>

        <div class="dialog-shell__footer">
          <ng-content select="[dialog-footer]"></ng-content>
        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .dialog-shell__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--border-color-soft);
      }

      .dialog-shell__heading h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--text-heading);
      }

      .dialog-shell__heading h2 span[nz-icon] {
        color: var(--primary-500);
      }

      .dialog-shell__heading p {
        margin: 6px 0 0;
        color: var(--text-muted);
        font-size: 13px;
      }

      .dialog-shell__close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        transition: var(--transition);
      }

      .dialog-shell__close:hover {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }

      .dialog-shell__body {
        padding-top: 24px;
      }

      .dialog-shell__footer {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        padding-top: 20px;
        margin-top: 24px;
        border-top: 1px solid var(--border-color-soft);
      }
      .dialog-shell__footer > * + * {
        margin-left: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogShellComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly icon = input<string | null>(null);
  readonly width = input<number>(720);
  readonly modalClass = input('');
  readonly cancel = output<void>();

  resolvedModalClass(): string {
    const extraClass = this.modalClass().trim();
    return extraClass ? `app-dialog-shell ${extraClass}` : 'app-dialog-shell';
  }
}
