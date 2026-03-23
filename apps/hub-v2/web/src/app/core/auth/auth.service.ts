import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { ApiClientService } from '../http/api-client.service';
import { AuthStore } from './auth.store';
import type { AuthUser, LoginInput } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  login(input: LoginInput): Observable<AuthUser> {
    return this.api.post<AuthUser, LoginInput>('/auth/login', input).pipe(
      tap((user) => {
        this.authStore.setCurrentUser(user);
        this.authStore.markInitialized();
      })
    );
  }

  logout(): Observable<{ ok: true }> {
    return this.api.post<{ ok: true }>('/auth/logout').pipe(
      tap(() => {
        this.authStore.reset();
        void this.router.navigateByUrl('/login');
      })
    );
  }

  getCurrentUser(): Observable<AuthUser> {
    return this.api.get<AuthUser>('/auth/me');
  }

  initialize(): Observable<boolean> {
    if (this.authStore.initialized()) {
      return of(this.authStore.isAuthenticated());
    }

    return this.getCurrentUser().pipe(
      tap((user) => this.authStore.setCurrentUser(user)),
      map(() => true),
      catchError(() => {
        this.authStore.setCurrentUser(null);
        return of(false);
      }),
      tap(() => this.authStore.markInitialized())
    );
  }
}
