import { inject, Injectable, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap, tap } from 'rxjs/operators';

import { AiApiService } from '../services/ai-api.service';
import type { AiIssueRecommendResult, AiAssigneeRecommendResult } from '../models/ai.model';

@Injectable({ providedIn: 'root' })
export class AiIssueStore {
  private readonly api = inject(AiApiService);

  readonly projectId = signal<string | null>(null);
  readonly title = signal('');
  readonly description = signal<string | null>(null);
  readonly loading = signal(false);
  readonly result = signal<AiIssueRecommendResult | null>(null);
  readonly assigneeLoading = signal(false);
  readonly assigneeResult = signal<AiAssigneeRecommendResult | null>(null);

  readonly canRecommend = computed(() => {
    return this.projectId() && this.title().trim().length >= 5;
  });

  private readonly title$ = toObservable(this.title);
  private recommendRequestId = 0;
  private assigneeRequestId = 0;

  constructor() {
    this.title$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((title) => {
          const projectId = this.projectId();
          const normalizedTitle = title.trim();
          if (!projectId || normalizedTitle.length < 5) {
            this.loading.set(false);
            this.result.set(null);
            this.assigneeResult.set(null);
            return of(null);
          }

          const requestId = ++this.recommendRequestId;
          this.loading.set(true);
          return this.api
            .recommendIssue({
              title: normalizedTitle,
              description: this.description(),
              projectId,
            })
            .pipe(
              tap((res) => {
                if (requestId !== this.recommendRequestId) {
                  return;
                }
                this.result.set(res);
              }),
              catchError(() => {
                if (requestId === this.recommendRequestId) {
                  this.result.set(null);
                  this.assigneeResult.set(null);
                }
                return of(null);
              }),
              finalize(() => {
                if (requestId === this.recommendRequestId) {
                  this.loading.set(false);
                }
              }),
            );
        }),
        tap((res) => {
          if (!res?.type) {
            this.assigneeResult.set(null);
            return;
          }
          void this.fetchAssigneeRecommendation();
        }),
      )
      .subscribe();
  }

  setProject(projectId: string): void {
    this.projectId.set(projectId);
  }

  updateTitle(title: string): void {
    this.title.set(title);
    if (title.trim().length < 5) {
      this.result.set(null);
      this.assigneeResult.set(null);
      this.loading.set(false);
      this.assigneeLoading.set(false);
    }
  }

  updateDescription(desc: string | null): void {
    this.description.set(desc);
  }

  async fetchAssigneeRecommendation(): Promise<void> {
    const projectId = this.projectId();
    const title = this.title().trim();
    const latestResult = this.result();
    if (!projectId || title.length < 5) {
      this.assigneeResult.set(null);
      this.assigneeLoading.set(false);
      return;
    }

    const requestId = ++this.assigneeRequestId;
    this.assigneeLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.recommendAssignee({
          title,
          description: this.description(),
          projectId,
          type: latestResult?.type ?? undefined,
          moduleCode: latestResult?.module?.code ?? null,
        }),
      );
      if (requestId !== this.assigneeRequestId) {
        return;
      }
      this.assigneeResult.set(res ?? null);
    } catch {
      if (requestId === this.assigneeRequestId) {
        this.assigneeResult.set(null);
      }
    } finally {
      if (requestId === this.assigneeRequestId) {
        this.assigneeLoading.set(false);
      }
    }
  }

  clear(): void {
    this.result.set(null);
    this.assigneeResult.set(null);
    this.loading.set(false);
    this.assigneeLoading.set(false);
  }
}
