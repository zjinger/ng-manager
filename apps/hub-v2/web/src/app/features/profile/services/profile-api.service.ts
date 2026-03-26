import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '@core/http';
import type { AuthUser } from '@core/auth';
import type { ChangePasswordInput, ProfileActivityRecord, ProfileNotificationPrefs } from '../models/profile.model';

interface UploadEntity {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly api = inject(ApiClientService);

  changePassword(input: ChangePasswordInput) {
    return this.api.post('/auth/change-password', input);
  }

  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('bucket', 'avatars');
    formData.set('category', 'avatar');
    formData.set('visibility', 'private');
    return this.api.post<UploadEntity, FormData>('/uploads', formData);
  }

  updateMyAvatar(uploadId: string | null) {
    return this.api.patch<AuthUser, { uploadId: string | null }>('/auth/avatar', { uploadId });
  }

  loadRecentActivities(days = 7): Observable<ProfileActivityRecord[]> {
    return this.api.get<ProfileActivityRecord[]>('/profile/activity', { days, limit: 100 });
  }

  loadNotificationPrefs(): Observable<ProfileNotificationPrefs> {
    return this.api.get<ProfileNotificationPrefs>('/profile/preferences');
  }

  saveNotificationPrefs(prefs: ProfileNotificationPrefs): Observable<ProfileNotificationPrefs> {
    return this.api.patch<ProfileNotificationPrefs, ProfileNotificationPrefs>('/profile/preferences', prefs);
  }
}
