import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '@core/http';

export interface GeneralSettings {
  platformName: string;
  platformDesc: string;
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
  openRegistration: boolean;
  emailWhitelist: string;
  defaultRole: string;
  requireApproval: boolean;
}

export interface SecuritySettings {
  minPasswordLength: number;
  requireComplexity: boolean;
  passwordExpiry: number;
  loginFailureLock: number;
  globalForce2FA: boolean;
  adminForce2FA: boolean;
  sessionTimeout: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  wechatWorkEnabled: boolean;
  feishuEnabled: boolean;
  dingtalkEnabled: boolean;
  browserPushEnabled: boolean;
}

export interface IntegrationItem {
  name: string;
  description: string;
  status: 'active' | 'inactive';
  icon: string;
}

export interface ApiKeyItem {
  name: string;
  key: string;
  scope: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'inactive';
}

export interface IntegrationSettings {
  integrations: IntegrationItem[];
  apiKeys: ApiKeyItem[];
}

@Injectable({ providedIn: 'root' })
export class SystemSettingsApiService {
  private readonly api = inject(ApiClientService);

  getGeneralSettings(): Observable<GeneralSettings> {
    return this.api.get<GeneralSettings>('/system-settings/general');
  }

  updateGeneralSettings(data: GeneralSettings): Observable<void> {
    return this.api.put<void, GeneralSettings>('/system-settings/general', data);
  }

  getSecuritySettings(): Observable<SecuritySettings> {
    return this.api.get<SecuritySettings>('/system-settings/security');
  }

  updateSecuritySettings(data: SecuritySettings): Observable<void> {
    return this.api.put<void, SecuritySettings>('/system-settings/security', data);
  }

  getNotificationSettings(): Observable<NotificationSettings> {
    return this.api.get<NotificationSettings>('/system-settings/notification');
  }

  updateNotificationSettings(data: NotificationSettings): Observable<void> {
    return this.api.put<void, NotificationSettings>('/system-settings/notification', data);
  }

  getIntegrationSettings(): Observable<IntegrationSettings> {
    return this.api.get<IntegrationSettings>('/system-settings/integration');
  }

  updateIntegrationSettings(data: IntegrationSettings): Observable<void> {
    return this.api.put<void, IntegrationSettings>('/system-settings/integration', data);
  }
}
