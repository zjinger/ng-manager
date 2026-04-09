import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { UPLOAD_TARGETS } from '@shared/constants';

@Component({
  selector: 'app-profile-hero',
  standalone: true,
  imports: [NzIconModule,NzTooltipModule],
  template: `
    <section class="profile-hero">
      <div class="profile-hero__bg"></div>
      <div class="profile-hero__content">
        <div class="profile-avatar-large">
          @if (avatarUrl()) {
            <img [src]="avatarUrl()!" [alt]="name()" />
          } @else {
            <span>{{ initials() || 'U' }}</span>
          }
          <input #avatarInput type="file" [accept]="avatarAccept" hidden (change)="onAvatarPicked($event)" />
          <button class="profile-avatar-edit" type="button" nz-tooltip="更换头像" (click)="avatarInput.click()">
            <nz-icon nzType="camera" nzTheme="fill"/>
          </button>
        </div>

        <div class="profile-hero-info">
          <h2>{{ name() }}</h2>
          <p>{{ subtitle() }}</p>
          <div class="profile-tags">
            @for (tag of tags(); track tag) {
              <span class="profile-tag" [class.profile-tag--admin]="$index === 0">{{ tag }}</span>
            }
          </div>
        </div>

        <!-- <div class="profile-hero-stats">
          @for (stat of stats(); track stat.label) {
            <div class="profile-stat">
              <div class="profile-stat-value">{{ stat.value }}</div>
              <div class="profile-stat-label">{{ stat.label }}</div>
            </div>
          }
        </div> -->
      </div>
    </section>
  `,
  styles: [
    `
      .profile-hero {
        position: relative;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(79, 70, 229, 0.26);
        background: linear-gradient(135deg, var(--primary-600) 0%, #7C3AED 50%, #EC4899 100%);
        border-radius: var(--border-radius);
        padding: 32px;
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
      }

      .profile-hero__bg {
        position: absolute;
        inset: 0;
        background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
      }

      .profile-hero__content {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 24px;
      }

      .profile-avatar-large {
        position: relative;
        display: grid;
        place-items: center;
        width: 104px;
        height: 104px;
        border-radius: 32px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.14));
        border: 1px solid rgba(255, 255, 255, 0.24);
        box-shadow: 0 20px 42px rgba(15, 23, 42, 0.24);
        backdrop-filter: blur(18px);
      }

      .profile-avatar-large > span {
        color: white;
        font-size: 38px;
        font-weight: 800;
        letter-spacing: -0.04em;
      }
      .profile-avatar-large > img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 32px;
      }

      .profile-avatar-edit {
        position: absolute;
        right: 0px;
        bottom: 0px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 50%;
        background: white;
        color: var(--primary-600);
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
        transition: all 0.2s;
        &:hover{
          background: var(--primary-50);
          color: var(--primary-700);
          cursor: pointer;
          transform: scale(1.1);
        }
      }

      .profile-hero-info {
        flex: 1;
        min-width: 0;
      }

      .profile-hero-info h2 {
        color: white;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.04em;
      }

      .profile-hero-info p {
        margin-top: 6px;
        color: rgba(255, 255, 255, 0.78);
        font-size: 14px;
      }

      .profile-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .profile-tag {
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: white;
        font-size: 12px;
        font-weight: 600;
      }

      .profile-tag--admin {
        background: rgba(255, 255, 255, 0.24);
      }

      .profile-hero-stats {
        display: flex;
        gap: 20px;
        padding: 12px 16px;
        border-radius: 22px;
        background: rgba(15, 23, 42, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(14px);
      }

      .profile-stat {
        position: relative;
        min-width: 84px;
        text-align: center;
      }

      .profile-stat + .profile-stat::before {
        content: '';
        position: absolute;
        left: -10px;
        top: 10px;
        bottom: 10px;
        width: 1px;
        background: rgba(255, 255, 255, 0.12);
      }

      .profile-stat-value {
        color: white;
        font-size: 28px;
        font-weight: 800;
        line-height: 1;
      }

      .profile-stat-label {
        margin-top: 6px;
        color: rgba(255, 255, 255, 0.68);
        font-size: 12px;
      }

      :host-context(html[data-theme='dark']) .profile-hero {
        background: linear-gradient(135deg, #312e81, #4338ca 52%, #1d4ed8);
        box-shadow: 0 28px 70px rgba(15, 23, 42, 0.32);
      }

      @media (max-width: 1080px) {
        .profile-hero__content {
          flex-direction: column;
          align-items: flex-start;
        }

        .profile-hero-stats {
          width: 100%;
          justify-content: flex-start;
        }
      }

      @media (max-width: 768px) {
        .profile-hero__content {
          padding: 22px 20px;
        }

        .profile-hero-stats {
          gap: 14px;
          padding: 10px 12px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeroComponent {
  readonly avatarAccept = UPLOAD_TARGETS.profileAvatar.accept;
  readonly initials = input('U');
  readonly name = input('当前账号');
  readonly subtitle = input('');
  readonly avatarUrl = input<string | null>(null);
  readonly tags = input<string[]>([]);
  readonly stats = input<{ label: string; value: number | string }[]>([]);
  readonly avatarChange = output<File>();

  onAvatarPicked(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (file) {
      this.avatarChange.emit(file);
    }
    if (input) {
      input.value = '';
    }
  }
}
