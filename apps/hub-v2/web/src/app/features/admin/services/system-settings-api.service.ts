import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/system-settings';

  getGeneralSettings(): Observable<GeneralSettings> {
    return this.http.get<GeneralSettings>(`${this.baseUrl}/general`);
  }

  updateGeneralSettings(data: GeneralSettings): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/general`, data);
  }

  getSecuritySettings(): Observable<SecuritySettings> {
    return this.http.get<SecuritySettings>(`${this.baseUrl}/security`);
  }

  updateSecuritySettings(data: SecuritySettings): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/security`, data);
  }

  getNotificationSettings(): Observable<NotificationSettings> {
    return this.http.get<NotificationSettings>(`${this.baseUrl}/notification`);
  }

  updateNotificationSettings(data: NotificationSettings): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/notification`, data);
  }

  getIntegrationSettings(): Observable<IntegrationSettings> {
    return this.http.get<IntegrationSettings>(`${this.baseUrl}/integration`);
  }

  updateIntegrationSettings(data: IntegrationSettings): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/integration`, data);
  }
}
