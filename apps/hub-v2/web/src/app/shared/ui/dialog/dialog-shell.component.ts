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
      [nzCentered]="center()"
      [nzFooter]="null"
      [nzWidth]="width()"
      [nzClosable]="false"
      [nzKeyboard]="false"
      [nzMaskClosable]="false"
      [nzClassName]="resolvedModalClass()"
      (nzOnCancel)="cancel.emit()"
    >
      <ng-container *nzModalContent>
        <div class="dialog-shell__header">
          @if (showAvatar()) {
            <div class="dialog-shell__header__info">
              <div class="dialog-shell__header__avatar">
                @if (avatarPreviewUrl()) {
                  <img [src]="avatarPreviewUrl()!" alt="avatar" />
                } @else {
                  {{ displayName()?.slice(0, 1)?.toUpperCase() }}
                }
              </div>
              <div class="dialog-shell__heading">
                <h2>{{title()}}</h2>
                <p>
                  {{ description() }}
                </p>
              </div>
            </div>
          } @else {
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
          }
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
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .dialog-shell__header__info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      .dialog-shell__header__avatar {
        width: 54px;
        height: 54px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff;
        font-size: 16px;
        font-weight: 700;
        overflow: hidden;
        flex-shrink: 0;
      }

      .dialog-shell__header__avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
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
        padding-top: 20px;
      }

      .dialog-shell__footer {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        padding-top: 20px;
        margin-top: 20px;
        border-top: 1px solid var(--border-color-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogShellComponent {
  readonly open = input(false);
  readonly center = input(false);
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly icon = input<string | null>(null);
  readonly width = input<number | string>(720);
  readonly modalClass = input('');
  readonly showAvatar = input<boolean>(false);
  readonly avatarPreviewUrl = input<string | null>(null);
  readonly displayName = input<string | null>(null);
  readonly description = input('');
  readonly cancel = output<void>();

  resolvedModalClass(): string {
    const extraClass = this.modalClass().trim();
    return extraClass ? `app-dialog-shell ${extraClass}` : 'app-dialog-shell';
  }
}
