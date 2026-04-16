import { computed, inject, Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ApiError } from '@core/http';
import type { PageResult } from '@core/types';
import type { CreateUserInput, UpdateUserInput, UserEntity, UserListQuery } from '../models/user.model';
import { UserApiService } from '../services/user-api.service';

const DEFAULT_QUERY: UserListQuery = {
  page: 1,
  pageSize: 100,
  keyword: '',
  status: '',
};

@Injectable()
export class UserStore {
  private readonly userApi = inject(UserApiService);
  private readonly message = inject(NzMessageService);

  private readonly queryState = signal<UserListQuery>({ ...DEFAULT_QUERY });
  private readonly resultState = signal<PageResult<UserEntity> | null>(null);
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);

  readonly query = computed(() => this.queryState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(() => this.resultState()?.items ?? []);
  readonly total = computed(() => this.resultState()?.total ?? 0);
  readonly loading = computed(() => this.loadingState());
  readonly busy = computed(() => this.busyState());

  initialize(): void {
    this.load();
  }

  updateQuery(patch: Partial<UserListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? 1,
    }));
    this.load();
  }

  load(): void {
    this.loadingState.set(true);
    this.userApi.list(this.queryState()).subscribe({
      next: (result) => {
        this.resultState.set(result);
        this.loadingState.set(false);
      },
      error: () => {
        this.loadingState.set(false);
      },
    });
  }

  create(input: CreateUserInput, done?: () => void): void {
    this.busyState.set(true);
    this.userApi.create(input).subscribe({
      next: (created) => {
        this.busyState.set(false);
        done?.();
        this.insertOrRefresh(created);
      },
      error: (error: unknown) => {
        this.busyState.set(false);
        if (error instanceof ApiError) {
          if (error.code === 'USER_ALREADY_EXISTS') {
            this.message.error('登录名已存在，请更换');
            return;
          }
          this.message.error(error.message || '创建用户失败');
          return;
        }
        this.message.error('创建用户失败');
      },
    });
  }

  update(userId: string, input: UpdateUserInput, done?: () => void): void {
    this.busyState.set(true);
    this.userApi.update(userId, input).subscribe({
      next: (updated) => {
        this.busyState.set(false);
        done?.();
        this.patchOrRefresh(updated);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  resetPassword(userId: string, done?: () => void): void {
    this.busyState.set(true);
    this.userApi.resetPassword(userId).subscribe({
      next: (result) => {
        this.busyState.set(false);
        this.message.success(`已重置 ${result.username} 的密码：${result.temporaryPassword}`);
        done?.();
      },
      error: (error: unknown) => {
        this.busyState.set(false);
        if (error instanceof ApiError) {
          this.message.error(error.message || '重置密码失败');
          return;
        }
        this.message.error('重置密码失败');
      },
    });
  }

  private patchOrRefresh(updated: UserEntity): void {
    const result = this.resultState();
    if (!result) {
      this.load();
      return;
    }

    const query = this.queryState();
    const keyword = query.keyword?.trim().toLowerCase() ?? '';
    const status = query.status?.trim() ?? '';
    const hasFilter = !!keyword || !!status;

    if (hasFilter) {
      this.load();
      return;
    }

    const index = result.items.findIndex((item) => item.id === updated.id);
    if (index < 0) {
      return;
    }

    const items = [...result.items];
    items[index] = updated;
    this.resultState.set({
      ...result,
      items,
    });
  }

  private insertOrRefresh(created: UserEntity): void {
    const result = this.resultState();
    if (!result) {
      this.load();
      return;
    }

    const query = this.queryState();
    const keyword = query.keyword?.trim().toLowerCase() ?? '';
    const status = query.status?.trim() ?? '';
    const hasFilter = !!keyword || !!status;
    const notFirstPage = query.page > 1;

    if (hasFilter || notFirstPage) {
      this.load();
      return;
    }

    const nextItems = [created, ...result.items].slice(0, query.pageSize);
    this.resultState.set({
      ...result,
      items: nextItems,
      total: result.total + 1,
    });
  }
}
