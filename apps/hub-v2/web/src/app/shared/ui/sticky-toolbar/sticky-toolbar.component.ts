import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-sticky-toolbar',
  standalone: true,
  template: `
    <div
      #toolbarRef
      class="sticky-toolbar"
      [class.sticky-toolbar--enabled]="enabled()"
      [class.sticky-toolbar--pinned]="pinned()"
      [style.top]="top()"
      [style.zIndex]="zIndex()"
    >
      <ng-content />
    </div>
  `,
  styles: [
    `
      .sticky-toolbar--enabled {
        position: sticky;
      }

      .sticky-toolbar--pinned {
        padding: 16px 8px;
        background: var(--bg-container);
      }

      :host ::ng-deep .sticky-toolbar--pinned .page-toolbar {
        margin-bottom: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StickyToolbarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('toolbarRef', { static: true }) private toolbarRef?: ElementRef<HTMLElement>;

  readonly enabled = input(false);
  readonly top = input('-24px');
  readonly zIndex = input(12);
  readonly pinned = signal(false);

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private scrollRoot: HTMLElement | Window | null = null;
  private readonly handleViewportChange = () => this.updatePinnedState();

  constructor() {
    effect(() => {
      if (!this.enabled()) {
        this.pinned.set(false);
        return;
      }
      queueMicrotask(() => this.updatePinnedState());
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.scrollRoot = this.hostElement.nativeElement.closest('.shell__content') as HTMLElement | null;
      const root = this.scrollRoot ?? window;
      root.addEventListener('scroll', this.handleViewportChange, { passive: true });
      window.addEventListener('resize', this.handleViewportChange, { passive: true });
      this.updatePinnedState();
    });
  }

  ngOnDestroy(): void {
    const root = this.scrollRoot ?? window;
    root.removeEventListener('scroll', this.handleViewportChange);
    window.removeEventListener('resize', this.handleViewportChange);
  }

  private updatePinnedState(): void {
    if (!this.enabled()) {
      this.pinned.set(false);
      return;
    }

    const toolbarElement = this.toolbarRef?.nativeElement;
    if (!toolbarElement) {
      return;
    }

    const rootTop = this.scrollRoot instanceof HTMLElement ? this.scrollRoot.getBoundingClientRect().top : 0;
    const nextPinned = toolbarElement.getBoundingClientRect().top <= rootTop + 1;
    if (nextPinned !== this.pinned()) {
      this.pinned.set(nextPinned);
    }
  }
}
