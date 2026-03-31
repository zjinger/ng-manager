import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import type {
  CreateUserInput,
  ResetUserPasswordInput,
  ResetUserPasswordResult,
  UpdateUserInput,
  UserEntity,
  UserListQuery,
  UserListResult,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly api = inject(ApiClientService);

  list(query: Partial<UserListQuery>) {
    return this.api.get<UserListResult>('/users', query);
  }

  getById(userId: string) {
    return this.api.get<UserEntity>(`/users/${userId}`);
  }

  create(input: CreateUserInput) {
    return this.api.post<UserEntity, CreateUserInput>('/users', input);
  }

  update(userId: string, input: UpdateUserInput) {
    return this.api.patch<UserEntity, UpdateUserInput>(`/users/${userId}`, input);
  }

  resetPassword(userId: string, input: ResetUserPasswordInput = {}) {
    return this.api.post<ResetUserPasswordResult, ResetUserPasswordInput>(`/users/${userId}/reset-password`, input);
  }
}
