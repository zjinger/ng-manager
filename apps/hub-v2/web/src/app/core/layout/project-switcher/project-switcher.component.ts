import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ProjectContextStore } from '../../state/project-context.store';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-switcher',
  standalone: true,
  imports: [NzIconModule, CommonModule],
  template: `
    <div class="switcher">
      <button class="switcher__trigger" [ngClass]="{ 'switcher__avatar--without-url': !showCurrentAvatar() }" type="button" (click)="toggleOpen()">
        <span class="switcher__avatar" >
          @if (showCurrentAvatar()) {
            <img [src]="currentProject()?.avatarUrl!" [alt]="currentProject()?.name || 'project'" (error)="onCurrentAvatarError()" />
          } @else {
            {{ currentProjectInitial() }}
          }
        </span>
        <span class="switcher__info">
          <span class="switcher__name">{{ currentProject()?.name || '选择项目' }}
          @if(currentProject()?.status==='inactive') {
              <span class="switcher__tag">
              已归档
            </span>
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
              (click)="selectProject(project.id)"
              [ngClass]="{ 'switcher__avatar--without-url': !showOptionAvatar(project.id, project.avatarUrl) }"
            >
              <span class="switcher__avatar switcher__avatar--option">
                @if (showOptionAvatar(project.id, project.avatarUrl)) {
                  <img [src]="project.avatarUrl!" [alt]="project.name" (error)="onOptionAvatarError(project.id)" />
                } @else {
                  {{ project.displayCode || projectNameInitial(project.name) }}
                }
              </span>
              <span class="switcher__info">
                <span class="switcher__name">
                  {{ project.name }}
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
  styles: [
    `
      .switcher {
        position: relative;
        padding: 12px;
        border-bottom: 1px solid var(--border-white-soft);
      }
      .switcher__trigger,
      .switcher__option {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: none;
        border-radius: var(--border-radius-sm);
        background: var(--bg-white-soft);
        color: var(--text-inverse);
        cursor: pointer;
        text-align: left;
        transition: var(--transition-base);
      }
      .switcher__trigger:hover,
      .switcher__option:hover,
      .switcher__option.is-active {
        background: var(--bg-white-hover);
      }
      .switcher__option.is-active {
        border-left: 2px solid var(--primary-500);
      }
      
      .switcher__avatar {
        width: 36px;
        height: 30px;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        overflow: hidden;
      }
      
      .switcher__trigger.switcher__avatar--without-url{
        .switcher__avatar {
          background: var(--gradient-brand);
        }
      }

      .switcher__avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .switcher__avatar--option.switcher__avatar--without-url {
        background: linear-gradient(135deg, var(--color-info), var(--primary-600));
      }
      .switcher__info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .switcher__name {
        color: var(--text-inverse);
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .switcher__tag {
        display: inline-flex;
        align-items: center;
        height: 18px;
        padding: 0 6px;
        border-radius: 999px;
        font-size: 10px;
        line-height: 16px;
        color: rgba(226, 232, 240, 0.88);
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: rgba(51, 65, 85, 0.48);
      }
      .switcher__key {
        color: rgba(226, 232, 240, 0.72);
        font-size: 11px;
      }
      .switcher__arrow {
        color: rgba(226, 232, 240, 0.72);
        font-size: 12px;
        transition: transform 0.2s ease;
      }
      .switcher__arrow--open {
        transform: rotate(180deg);
      }
      .switcher__dropdown {
        position: absolute;
        top: calc(100% - 4px);
        left: 12px;
        right: 12px;
        z-index: 30;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
        border: 1px solid var(--border-white-soft);
        border-radius: var(--border-radius);
        background: rgba(15, 23, 42, 0.96);
        box-shadow: var(--shadow-lg);
        backdrop-filter: blur(14px);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSwitcherComponent {
  readonly projectContext = inject(ProjectContextStore);
  readonly open = signal(false);
  readonly currentProject = this.projectContext.currentProject;
  readonly currentAvatarBroken = signal(false);
  readonly optionAvatarBroken = signal<Record<string, true>>({});
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

  projectNameInitial(name: string): string {
    const normalized = name.trim();
    if (!normalized) {
      return '项目';
    }

    const latinWords = normalized
      .split(/[\s\-_.]+/)
      .map((item) => item.trim())
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
