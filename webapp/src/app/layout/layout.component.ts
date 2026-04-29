import { Component, computed, effect, inject, signal, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WsClientService } from '@app/core/ws';
import type { WsState } from '@app/core/ws';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { LayoutFooterComponent } from "./footer/layout-footer.component";
import { LayoutHeaderComponent } from "./header/layout-header.component";
import { LayoutSidebarComponent } from './sidebar/layout-sidebar.component';
import { toSignal } from '@angular/core/rxjs-interop';
@Component({
  selector: 'ngm-layout',
  imports: [
    RouterModule,
    NzLayoutModule,
    NzBreadCrumbModule,
    NzIconModule,
    NzMenuModule,
    LayoutSidebarComponent,
    LayoutHeaderComponent,
    LayoutFooterComponent
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.less',
})
export class LayoutComponent {
  private ws = inject(WsClientService);

  constructor() {
    this.ws.connect();
    effect(() => this.syncVisible());
  }

  readonly wsState: Signal<WsState> = toSignal(this.ws.stateChanges(), {
    initialValue: 'idle' as WsState,
  });

  /** 规则：非 open 展示（逻辑态） */
  private readonly shouldShow = computed(() => this.wsState() !== 'open');

  /** DOM 是否渲染（含离场期间） */
  readonly visible = signal(false);
  /** 是否处于离场动画 */
  readonly leaving = signal(false);

  /** 给“正常启动瞬间 connecting”一个免闪窗口 */
  private readonly SHOW_DELAY_MS = 200;
  private showTimer?: any;

  /** 防止 transitionend/animationend 触发多次导致重复 set */
  private removed = false;

  private syncVisible() {
    const show = this.shouldShow();

    if (show) {
      this.removed = false;
      if (this.visible()) {
        this.leaving.set(false);
        return;
      }
      this.startShowDelay();
      return;
    }

    // open：触发离场
    this.clearShowDelay();
    if (this.visible() && !this.leaving()) {
      this.leaving.set(true);
    }
  }

  private startShowDelay() {
    if (this.showTimer) return;
    this.showTimer = setTimeout(() => {
      this.showTimer = undefined;
      if (this.shouldShow()) {
        this.visible.set(true);
        this.leaving.set(false);
        this.removed = false;
      }
    }, this.SHOW_DELAY_MS);
  }

  private clearShowDelay() {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }
  }

  /** 内层动画结束（opacity/transform）*/
  onInnerAnimationEnd(evt: AnimationEvent) {
    // 不做移除，真正的 DOM 移除交给 wrap 的 transitionend（height 归零）
  }

  /** 外层高度 transition 结束：此时高度已经 0，再移除 DOM，不会“瞬间上移” */
  onWrapTransitionEnd(evt: TransitionEvent) {
    if (evt.propertyName !== 'height') return;
    if (this.removed) return;
    if (!this.shouldShow() && this.leaving()) {
      this.removed = true;
      this.visible.set(false);
      this.leaving.set(false);
    }
  }
}
