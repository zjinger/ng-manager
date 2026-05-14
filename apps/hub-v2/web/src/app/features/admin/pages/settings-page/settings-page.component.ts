import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PageHeaderComponent, TabsComponent } from '@shared/ui';
import { GeneralSettingsComponent } from './general-settings.component';
import { SecuritySettingsComponent } from './security-settings.component';
import { NotificationSettingsComponent } from './notification-settings.component';
import { IntegrationSettingsComponent } from './integration-settings.component';

type SettingsTab = 'general' | 'security' | 'notifications' | 'integration';

@Component({
  selector: 'app-settings-page',
  imports: [
    PageHeaderComponent,
    TabsComponent,
    GeneralSettingsComponent,
    SecuritySettingsComponent,
    NotificationSettingsComponent,
    IntegrationSettingsComponent,
  ],
  template: `
    <app-page-header title="系统设置" subtitle="管理平台全局配置、安全策略和集成选项" />

    <app-tabs
      [tabs]="tabs"
      [activeId]="activeTab()"
      (tabChange)="activeTab.set($any($event))"
    />

    @switch (activeTab()) {
      @case ('general') {
        <app-general-settings />
      }
      @case ('security') {
        <app-security-settings />
      }
      @case ('notifications') {
        <app-notification-settings />
      }
      @case ('integration') {
        <app-integration-settings />
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {
  readonly activeTab = signal<SettingsTab>('general');
  readonly tabs = [
    { id: 'general', label: '常规设置', icon: 'setting' },
    { id: 'security', label: '安全策略', icon: 'security-scan' },
    { id: 'notifications', label: '通知配置', icon: 'bell' },
    { id: 'integration', label: '集成与 API', icon: 'api' },
  ];
}
