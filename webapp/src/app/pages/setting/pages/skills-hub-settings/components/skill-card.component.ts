import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { SKILL_CATEGORY_OPTIONS } from '../constants/skill-hub-options';
import type { SkillEntity } from '../models/skill-hub.model';
import { avatarText, avatarTone, skillIconTone, skillIconType } from '../utils/skill-icon.util';

@Component({
  selector: 'app-skill-card',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: `
    <article class="skill-card" [class.is-selected]="selected()" (click)="cardClick.emit(skill())">
      <div class="skill-card-header">
        <div class="skill-icon" [ngClass]="iconTone()">
          <nz-icon [nzType]="iconType()" nzTheme="outline" />
        </div>
        <div class="skill-card-info">
          <h3 class="skill-card-title">
            <span class="skill-card-title-text">{{ skill().name }}</span>
            <span class="skill-stat version">{{ skill().latestVersion || '未发布' }}</span>
          </h3>
          <div class="skill-card-author">
            <span class="skill-card-author-avatar" [ngClass]="ownerAvatarTone()">{{
              ownerAvatarText()
            }}</span>
            <span>{{ skill().ownerName || '未知作者' }}</span>
          </div>
        </div>
      </div>
      <p class="skill-card-desc">{{ description() }}</p>
      <div class="skill-card-footer">
        <div class="skill-stats">
          <span class="skill-tag category">{{ categoryLabel() }}</span>
          @for (tag of skill().tags.slice(0, 3); track tag) {
            <span class="skill-tag">{{ tag }}</span>
          }
        </div>
        <span class="skill-card-updated">更新 {{ skill().updatedAt | date: 'MM-dd HH:mm' }}</span>
      </div>
    </article>
  `,
  styles: [
    `
      .skill-card {
        padding: 18px;
        height: 200px;
        border: 1px solid var(--app-border-color);
        border-radius: 12px;
        background: var(--app-component-bg);
        cursor: pointer;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;

        display: flex;
        flex-direction: column;
      }
      .skill-card:hover {
        border-color: var(--app-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
      .skill-card.is-selected {
        border-color: var(--app-primary);
      }
      .skill-card-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .skill-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border-radius: 10px;
        font-size: 18px;
      }
      .skill-card-info {
        flex: 1;
        min-width: 0;
      }
      .skill-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 15px;
        font-weight: 600;
      }
      .skill-card-title-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .skill-stat.version {
        font-size: 12px;
        color: var(--app-text-secondary);
        font-weight: 400;
      }
      .skill-card-author {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        font-size: 13px;
        color: var(--app-text-secondary);
      }
      .skill-card-author-avatar {
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border-radius: 50%;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
      }
      .skill-card-desc {
        margin: 10px 0 0;
        font-size: 13px;
        color: var(--app-text-secondary);
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .skill-card-footer {
        margin-top: auto;
        text-align: right;
      }
      .skill-stats {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .skill-tag {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 4px;
        font-size: 12px;
        background: #fafafa;
        color: var(--app-text-secondary);
      }
      .skill-tag.category {
        background: color-mix(in srgb, var(--app-primary) 12%, transparent);
        color: var(--app-primary);
      }
      .skill-card-updated {
        font-size: 12px;
        color: var(--text-color-gray);
        white-space: nowrap;
      }
      .blue {
        background: #eff6ff;
        color: #2563eb;
      }
      .purple {
        background: #f3e8ff;
        color: #7c3aed;
      }
      .green {
        background: #ecfdf5;
        color: #059669;
      }
      .orange {
        background: #fffbeb;
        color: #d97706;
      }
      .rose {
        background: #fff1f2;
        color: #e11d48;
      }
      .cyan {
        background: #ecfeff;
        color: #0891b2;
      }
      .indigo {
        background: #eef2ff;
        color: #4f46e5;
      }
      .a1 {
        background: linear-gradient(135deg, #14b8a6, #0ea5e9);
      }
      .a2 {
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
      }
      .a3 {
        background: linear-gradient(135deg, #f97316, #ef4444);
      }
      .a4 {
        background: linear-gradient(135deg, #22c55e, #84cc16);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCardComponent {
  readonly skill = input.required<SkillEntity>();
  readonly selected = input(false);
  readonly cardClick = output<SkillEntity>();

  protected iconType(): string {
    return skillIconType(this.skill());
  }

  protected iconTone(): string {
    return skillIconTone(this.skill());
  }

  protected ownerAvatarTone(): string {
    return avatarTone(this.skill());
  }

  protected ownerAvatarText(): string {
    return avatarText(this.skill().ownerName);
  }

  protected categoryLabel(): string {
    const value = this.skill().category?.trim() || 'general';
    return SKILL_CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value;
  }

  protected description(): string {
    const item = this.skill();
    return this.markdownSummary(item.descriptionMd) || item.description?.trim() || item.slug;
  }

  private markdownSummary(value: string | null | undefined): string {
    return (value || '')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#>*_~\-\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
