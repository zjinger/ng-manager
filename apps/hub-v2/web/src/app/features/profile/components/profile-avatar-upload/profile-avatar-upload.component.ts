import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-profile-avatar-upload',
  standalone: true,
  template: `
    <div class="hero-avatar">
      <span>{{ initials() || 'U' }}</span>
      <button class="hero-avatar__edit" type="button">更换</button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .hero-avatar {
        position: relative;
        display: grid;
        place-items: center;
        width: 96px;
        height: 96px;
        border-radius: 30px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.14));
        border: 1px solid rgba(255, 255, 255, 0.22);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
        backdrop-filter: blur(18px);
      }

      .hero-avatar > span {
        color: white;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.04em;
      }

      .hero-avatar__edit {
        position: absolute;
        right: -6px;
        bottom: -6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        height: 28px;
        padding: 0 10px;
        border: none;
        border-radius: 999px;
        background: white;
        color: var(--primary-600);
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileAvatarUploadComponent {
  readonly initials = input('U');
}
