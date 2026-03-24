import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ProjectContextStore } from '../../state/project-context.store';

@Component({
  selector: 'app-project-switcher',
  standalone: true,
  imports: [NzIconModule],
  template: `
    <div class="switcher">
      <button class="switcher__trigger" type="button" (click)="toggleOpen()">
        <span class="switcher__avatar">{{ currentProjectInitial() }}</span>
        <span class="switcher__info">
          <span class="switcher__name">{{ currentProject()?.name || '选择项目' }}</span>
          <span class="switcher__key">
            <!-- {{ currentProject()?.projectKey || '暂无项目上下文' }} -->
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
            >
              <span class="switcher__avatar switcher__avatar--option">
                {{ project.projectKey.slice(0, 2).toUpperCase() }}
              </span>
              <span class="switcher__info">
                <span class="switcher__name">{{ project.name }}</span>
                <!-- <span class="switcher__key">{{ project.projectKey }}</span> -->
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
      .switcher__avatar {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: var(--gradient-brand);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
      .switcher__avatar--option {
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
  readonly currentProjectInitial = computed(() =>
    (this.currentProject()?.projectKey || this.currentProject()?.name || 'PJ').slice(0, 2).toUpperCase()
  );

  toggleOpen(): void {
    this.open.update((value) => !value);
  }

  selectProject(projectId: string): void {
    this.projectContext.setCurrentProjectId(projectId);
    this.open.set(false);
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
