import { Injectable, inject } from '@angular/core';
import { map, Observable, of, switchMap } from 'rxjs';

import { API_BASE_URL, ApiClientService } from '@core/http';
import { buildUploadFormData, UPLOAD_TARGETS } from '@shared/constants';
import type {
  CreateMobileAppVersionInput,
  MobileAppReleaseRecord,
  MobileAppVersion,
  MobileAppVersionStats,
  PortalSettings,
  UpdateMobileAppVersionInput,
} from '../models/mobile-app-version.model';
import { DEFAULT_PORTAL_SETTINGS as PORTAL_DEFAULTS } from '../models/mobile-app-version.model';

interface UploadEntity {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class MobileAppVersionApiService {
  private readonly api = inject(ApiClientService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  listVersions(projectId: string): Observable<MobileAppVersion[]> {
    return this.api.get<MobileAppVersion[]>(this.basePath(projectId, 'versions'));
  }

  getVersion(projectId: string, id: string): Observable<MobileAppVersion> {
    return this.api.get<MobileAppVersion>(this.basePath(projectId, `versions/${encodeURIComponent(id)}`));
  }

  createVersion(projectId: string, input: CreateMobileAppVersionInput): Observable<MobileAppVersion> {
    return this.withPackageUpload(input).pipe(
      switchMap((payload) =>
        this.api.post<MobileAppVersion, CreateMobileAppVersionInput>(this.basePath(projectId, 'versions'), payload),
      ),
    );
  }

  updateVersion(projectId: string, id: string, input: UpdateMobileAppVersionInput): Observable<MobileAppVersion> {
    return this.withPackageUpload(input).pipe(
      switchMap((payload) =>
        this.api.patch<MobileAppVersion, UpdateMobileAppVersionInput>(
          this.basePath(projectId, `versions/${encodeURIComponent(id)}`),
          payload,
        ),
      ),
    );
  }

  deleteVersion(projectId: string, id: string): Observable<boolean> {
    return this.api
      .delete<{ success: true }>(this.basePath(projectId, `versions/${encodeURIComponent(id)}`))
      .pipe(map((result) => result.success === true));
  }

  publishVersion(projectId: string, id: string): Observable<MobileAppVersion> {
    return this.api.post<MobileAppVersion>(this.basePath(projectId, `versions/${encodeURIComponent(id)}/publish`));
  }

  archiveVersion(projectId: string, id: string): Observable<MobileAppVersion> {
    return this.api.post<MobileAppVersion>(this.basePath(projectId, `versions/${encodeURIComponent(id)}/archive`));
  }

  getStats(projectId: string): Observable<MobileAppVersionStats> {
    return this.api.get<MobileAppVersionStats>(this.basePath(projectId, 'stats'));
  }

  getReleaseRecords(projectId: string): Observable<MobileAppReleaseRecord[]> {
    return this.api.get<MobileAppReleaseRecord[]>(this.basePath(projectId, 'release-logs'));
  }

  getPortalSettings(projectId: string): Observable<PortalSettings> {
    return this.api.get<PortalSettings>(this.basePath(projectId, 'portal-settings'));
  }

  updatePortalSettings(projectId: string, settings: PortalSettings): Observable<PortalSettings> {
    return this.withLogoUpload(settings).pipe(
      switchMap((payload) =>
        this.api.put<PortalSettings, PortalSettings>(this.basePath(projectId, 'portal-settings'), payload),
      ),
    );
  }

  resetPortalSettings(projectId: string): Observable<PortalSettings> {
    return this.updatePortalSettings(projectId, { ...PORTAL_DEFAULTS });
  }

  private withPackageUpload<T extends CreateMobileAppVersionInput | UpdateMobileAppVersionInput>(
    input: T,
  ): Observable<T> {
    const { packageFile, ...payload } = input;
    if (!packageFile) {
      return of(payload as T);
    }
    const formData = buildUploadFormData(packageFile, UPLOAD_TARGETS.mobileAppPackage);
    return this.api.post<UploadEntity, FormData>('/uploads', formData).pipe(
      map((upload) => ({
        ...payload,
        packageUploadId: upload.id,
      }) as T),
    );
  }

  private withLogoUpload(settings: PortalSettings): Observable<PortalSettings> {
    const { logoFile, ...payload } = settings;
    if (!logoFile) {
      return of(payload);
    }
    const formData = buildUploadFormData(logoFile, UPLOAD_TARGETS.projectAvatar);
    return this.api.post<UploadEntity, FormData>('/uploads', formData).pipe(
      map((upload) => ({
        ...payload,
        logoUrl: `${this.apiBaseUrl}/uploads/${upload.id}/raw`,
      })),
    );
  }

  private basePath(projectId: string, suffix: string): string {
    return `/projects/${encodeURIComponent(projectId)}/mobile-app/${suffix}`;
  }
}
