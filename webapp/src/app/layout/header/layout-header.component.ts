import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  Signal,
} from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { toSignal } from '@angular/core/rxjs-interop';

import { WsClientService } from '@app/core';
import type { WsState } from '@app/core/ws/ws.types';

@Component({
  selector: 'ngm-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzLayoutModule, NzIconModule],
  template: `
    @if (visible() && waitingForOpen()) {
      <nz-header
        class="app-header"
        [class.fade-out-up]="leaving()"
        (animationend)="onAnimationEnd()"
      >
        <nz-icon nzType="disconnect" nzTheme="outline" />
        <span>连接已断开</span>
      </nz-header>
    }
  `,
  styles: [
    `
      nz-header.app-header {
        padding: 0;
        width: 100%;
        position: relative;
        height: 48px;
        line-height: 48px;
        background: var(--header-error-background);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        gap: 8px;
      }

      .app-header.fade-out-up {
        animation: fadeOutUp 0.35s ease forwards;
      }

      @keyframes fadeOutUp {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-48px);
        }
      }
    `,
  ],
})
export class LayoutHeaderComponent {
  private ws = inject(WsClientService);

  readonly wsState: Signal<WsState> = toSignal(this.ws.stateChanges(), {
    initialValue: 'idle' as WsState,
  });

  /** DOM 是否渲染（包含离场动画期间仍保持 true） */
  readonly visible = signal(false);

  /** 是否处于离场动画 */
  readonly leaving = signal(false);

  /** 是否等待连接打开（延时显示） */
  readonly waitingForOpen = signal(false);

  private readonly shouldShow = computed(() => {
    const s = this.wsState();
    return s !== 'open'
  });

  constructor() {
    effect(() => {
      if (this.shouldShow()) {
        this.visible.set(true);
        this.leaving.set(false);
      } else if (this.visible()) {
        this.leaving.set(true);
      }
    });

    setTimeout(() => {
      this.waitingForOpen.set(true);
    }, 10_000);
  }

  onAnimationEnd() {
    // 动画结束后再移除 DOM
    if (!this.shouldShow()) {
      this.visible.set(false);
      this.leaving.set(false);
    }
  }
}
