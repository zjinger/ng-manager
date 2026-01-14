import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
} from "@angular/core";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Observable, Subject, takeUntil, throttleTime } from "rxjs";

type TerminalTheme = {
  background?: string;
  foreground?: string;
  cursor?: string;
  selectionBackground?: string;
};

@Component({
  selector: "app-terminal-view",
  standalone: true,
  template: `<div class="term-wrap" #terminal></div>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
        min-height: 0;
        overflow: hidden;
      }
      .term-wrap {
        height: 100%;
        width: 100%;
        overflow: hidden;
      }
      .term-wrap :global(.xterm),
      .term-wrap :global(.xterm-viewport),
      .term-wrap :global(.xterm-screen) {
        height: 100%;
      }
    `,
  ],
})
export class TerminalViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild("terminal", { static: true }) terminal!: ElementRef<HTMLDivElement>;
  @Output() resized = new EventEmitter<{ cols: number; rows: number }>();

  /** 是否自动滚到底部 */
  @Input() follow = true;

  /** xterm 基础配置 */
  @Input() fontSize = 16;
  @Input() fontFamily =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  @Input() cursorBlink = false;
  @Input() cursorStyle: "block" | "underline" | "bar" = "underline";

  /** 可选：主题 */
  @Input() theme?: TerminalTheme;

  /**
   * ResizeObserver 触发后，fit 的“节流间隔”
   * - 拖拽过程中最多每 N ms fit 一次
   * - 停手后会自动补一次最终 fit
   */
  @Input() fitThrottleMs = 500;

  private term?: Terminal;
  private fitAddon?: FitAddon;
  private destroy$ = new Subject<void>()
  constructor(private zone: NgZone) { }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const term = new Terminal({
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        cursorBlink: this.cursorBlink,
        cursorStyle: this.cursorStyle,
        disableStdin: true,
        scrollback: 5000,
        theme: this.theme,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());
      const ele = this.terminal.nativeElement;
      term.open(ele);

      this.term = term;
      this.fitAddon = fit;

      this.term.onResize(({ cols, rows }) => {
        // console.log(`terminal resized: ${cols} cols, ${rows} rows`);
        this.resized.emit({ cols, rows });
      })
      this.fit();
      this.resizeObservable(ele)
        .pipe(
          takeUntil(this.destroy$),
          throttleTime(this.fitThrottleMs),
        )
        .subscribe(() => {
          setTimeout(() => {
            this.fit()
          }, 0);
        });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
    this.term?.dispose();
  }

  /* ---------------- public api ---------------- */

  write(chunk: string) {
    const term = this.term;
    if (!term) return;
    term.write(chunk);
    if (this.follow) term.scrollToBottom();
  }

  writeln(line: string) {
    const term = this.term;
    if (!term) return;
    term.writeln(line);
    if (this.follow) term.scrollToBottom();
  }

  clear() {
    this.term?.clear();
  }

  reset() {
    this.term?.write("\x1bc"); // RIS reset
  }

  copyAll(): string {
    const term = this.term;
    if (!term) return "";
    const buf = term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buf.length; i++) {
      lines.push(buf.getLine(i)?.translateToString(true) ?? "");
    }
    return lines.join("\n");
  }

  scrollToBottom() {
    this.term?.scrollToBottom();
  }

  /** 外部手动触发 fit（不走 throttle，直接走一次） */
  fit() {
    this.fitAddon?.fit();
  }

  getColsRows(): { cols: number; rows: number } | null {
    const t = this.term;
    if (!t) return null;
    return { cols: t.cols, rows: t.rows };
  }

  private resizeObservable(elem: HTMLElement): Observable<ResizeObserverEntry[]> {
    return new Observable(subscriber => {
      const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        subscriber.next(entries);
      });
      ro.observe(elem);
      return () => {
        ro.unobserve(elem);
      }
    });
  }

}
