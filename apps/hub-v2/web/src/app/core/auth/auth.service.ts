import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { ApiClientService } from '../http/api-client.service';
import { AuthStore } from './auth.store';
import { encryptLoginPassword } from './login-crypto.util';
import type { AuthUser, LoginChallenge, LoginInput } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  login(input: LoginInput): Observable<AuthUser> {
    const username = input.username.trim();
    return this.api.get<LoginChallenge>('/auth/login/challenge').pipe(
      switchMap((challenge) => {
        const encrypted = encryptLoginPassword(`${challenge.nonce}:${input.password}`, 'ngm_hub_login_aes_2026');
        return this.api.post<AuthUser, { username: string; nonce: string; iv: string; cipherText: string }>(
          '/auth/login',
          {
            username,
            nonce: challenge.nonce,
            iv: encrypted.iv,
            cipherText: encrypted.cipherText,
          }
        );
      }),
      catchError((error) => {
        const status = Number(error?.status ?? 0);
        if (status !== 400 && status !== 404) {
          return throwError(() => error);
        }
        return this.api.post<AuthUser, LoginInput>('/auth/login/plain', { username, password: input.password });
      }),
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
