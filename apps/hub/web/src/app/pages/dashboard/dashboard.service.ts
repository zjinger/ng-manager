import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HubApiService } from '../../core/http/hub-api.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import type {
  DashboardStatCardPreferenceItem,
  DashboardStatPreferencesData,
  DashboardViewData
} from './models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  public constructor(
    private readonly api: HubApiService,
    private readonly auth: AdminAuthService
  ) {}

  public async loadDashboard(): Promise<DashboardViewData> {
    const profile = await this.auth.ensureSession();
    if (!profile) {
      throw new Error('当前登录状态已失效，请重新登录');
    }

    return firstValueFrom(this.api.get<DashboardViewData>('/api/admin/dashboard/summary'));
  }

  public async loadStatPreferences(): Promise<DashboardStatPreferencesData> {
    const profile = await this.auth.ensureSession();
    if (!profile) {
      throw new Error('当前登录状态已失效，请重新登录');
    }

    return firstValueFrom(this.api.get<DashboardStatPreferencesData>('/api/admin/dashboard/preferences'));
  }

  public async updateStatPreferences(cards: DashboardStatCardPreferenceItem[]): Promise<DashboardStatPreferencesData> {
    const profile = await this.auth.ensureSession();
    if (!profile) {
      throw new Error('当前登录状态已失效，请重新登录');
    }

    return firstValueFrom(
      this.api.put<DashboardStatPreferencesData, {
        cards: Array<Pick<DashboardStatCardPreferenceItem, 'key' | 'enabled' | 'order' | 'filters'>>;
      }>('/api/admin/dashboard/preferences', {
        cards: cards.map((item) => ({
          key: item.key,
          enabled: item.enabled,
          order: item.order,
          filters: item.filters
        }))
      })
    );
  }
}
