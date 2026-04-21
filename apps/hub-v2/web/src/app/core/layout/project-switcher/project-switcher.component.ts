import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ProjectContextStore } from '../../state/project-context.store';

const SPEED = 50; // px/s

@Component({
  selector: 'app-project-switcher',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: `
    <div class="switcher">
      <button
        class="switcher__trigger"
        [ngClass]="{ 'switcher__avatar--without-url': !showCurrentAvatar() }"
        type="button"
        (click)="toggleOpen()"
      >
        <span class="switcher__avatar">
          @if (showCurrentAvatar()) {
            <img
              [src]="currentProject()?.avatarUrl!"
              [alt]="currentProject()?.name || 'project'"
              (error)="onCurrentAvatarError()"
            />
          } @else {
            {{ currentProjectInitial() }}
          }
        </span>

        <span class="switcher__info">
          <span class="switcher__name">
            <span
              #triggerMarquee
              class="switcher__name-marquee"
              [class.is-scrolling]="isScrolling(triggerKey())"
              [style.--scroll-dist]="scrollDist(triggerKey())"
              [style.--scroll-dur.s]="scrollDur(triggerKey())"
              (mouseenter)="onMouseEnter(triggerKey(), triggerMarquee)"
              (mouseleave)="onMouseLeave(triggerKey())"
            >
              <span class="switcher__name-text">
                {{ currentProject()?.name || '选择项目' }}
              </span>
            </span>

            @if (currentProject()?.status === 'inactive') {
              <span class="switcher__tag">已归档</span>
            }
          </span>
        </span>

        <span
          nz-icon
          nzType="down"
          class="switcher__arrow"
          [class.switcher__arrow--open]="open()"
        ></span>
      </button>

      @if (open()) {
        <div class="switcher__dropdown">
          @for (project of projectContext.projects(); track project.id) {
            <button
              type="button"
              class="switcher__option"
              [class.is-active]="project.id === projectContext.currentProjectId()"
              [ngClass]="{ 'switcher__avatar--without-url': !showOptionAvatar(project.id, project.avatarUrl) }"
              (click)="selectProject(project.id)"
            >
              <span class="switcher__avatar switcher__avatar--option">
                @if (showOptionAvatar(project.id, project.avatarUrl)) {
                  <img
                    [src]="project.avatarUrl!"
                    [alt]="project.name"
                    (error)="onOptionAvatarError(project.id)"
                  />
                } @else {
                  {{ project.displayCode || projectNameInitial(project.name) }}
                }
              </span>

              <span class="switcher__info">
                <span class="switcher__name">
                  <span
                    #optionMarquee
                    class="switcher__name-marquee"
                    [class.is-scrolling]="isScrolling(optionKey(project.id))"
                    [style.--scroll-dist]="scrollDist(optionKey(project.id))"
                    [style.--scroll-dur.s]="scrollDur(optionKey(project.id))"
                    (mouseenter)="onMouseEnter(optionKey(project.id), optionMarquee)"
                    (mouseleave)="onMouseLeave(optionKey(project.id))"
                  >
                    <span class="switcher__name-text">
                      {{ project.name }}
                    </span>
                  </span>

                  @if (project.status === 'inactive') {
                    <span class="switcher__tag">已归档</span>
                  }
                </span>
              </span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./project-switcher.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSwitcherComponent {
  readonly projectContext = inject(ProjectContextStore);

  readonly open = signal(false);
  readonly currentProject = this.projectContext.currentProject;

  readonly currentAvatarBroken = signal(false);
  readonly optionAvatarBroken = signal<Record<string, true>>({});

  readonly scrollMeta = signal<Record<string, { dist: number; dur: number }>>({});
  readonly animatingKeys = signal<Set<string>>(new Set());

  readonly currentProjectInitial = computed(() =>
    this.projectNameInitial(this.currentProject()?.displayCode || this.currentProject()?.name || '项目')
  );

  readonly showCurrentAvatar = computed(
    () => !!this.currentProject()?.avatarUrl && !this.currentAvatarBroken()
  );

  constructor() {
    effect(() => {
      this.currentProject()?.avatarUrl;
      this.currentAvatarBroken.set(false);
    });
  }

  toggleOpen(): void {
    this.open.update((value) => !value);
  }

  selectProject(projectId: string): void {
    this.projectContext.setCurrentProjectId(projectId);
    this.open.set(false);
  }

  showOptionAvatar(projectId: string, avatarUrl: string | null): boolean {
    return !!avatarUrl && !this.optionAvatarBroken()[projectId];
  }

  onCurrentAvatarError(): void {
    this.currentAvatarBroken.set(true);
  }

  onOptionAvatarError(projectId: string): void {
    this.optionAvatarBroken.update((current) => ({ ...current, [projectId]: true }));
  }

  triggerKey(): string {
    return `trigger:${this.currentProject()?.id ?? 'none'}`;
  }

  optionKey(projectId: string): string {
    return `option:${projectId}`;
  }

  onMouseEnter(key: string, marqueeEl: HTMLElement): void {
    const textEl = marqueeEl.querySelector<HTMLElement>('.switcher__name-text');
    if (!textEl) {
      return;
    }

    const dist = Math.max(0, Math.ceil(textEl.scrollWidth - marqueeEl.clientWidth));
    if (dist <= 0) {
      return;
    }

    const dur = Math.max(2.4, dist / SPEED);

    this.scrollMeta.update((meta) => ({
      ...meta,
      [key]: { dist, dur },
    }));

    const next = new Set(this.animatingKeys());
    next.add(key);
    this.animatingKeys.set(next);
  }

  onMouseLeave(key: string): void {
    const next = new Set(this.animatingKeys());
    next.delete(key);
    this.animatingKeys.set(next);
  }

  isScrolling(key: string): boolean {
    return this.animatingKeys().has(key);
  }

  scrollDist(key: string): number {
    return this.scrollMeta()[key]?.dist ?? 0;
  }

  scrollDur(key: string): number {
    return this.scrollMeta()[key]?.dur ?? 3;
  }

  projectNameInitial(name: string): string {
    const normalized = name.trim();
    if (!normalized) {
      return '项目';
    }

    const latinWords = normalized
      .split(/[\s\-_.]+/)
      .map((word) => word.trim())
      .filter(Boolean);

    if (latinWords.length >= 3) {
      return `${latinWords[0][0]}${latinWords[1][0]}${latinWords[2][0]}`.toUpperCase();
    }

    if (/^[a-z0-9\s\-_.]+$/i.test(normalized)) {
      return normalized.replace(/[\s\-_.]+/g, '').slice(0, 3).toUpperCase();
    }

    return normalized.slice(0, 3).toUpperCase();
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!target.closest('app-project-switcher')) {
      this.open.set(false);
    }
  }
}