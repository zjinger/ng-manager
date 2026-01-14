import { inject, Injectable } from '@angular/core';
import { TasksApiService } from './tasks-api.service';
import { firstValueFrom } from 'rxjs';
import { TaskRuntimeStore } from './task-runtime-store';

@Injectable({
  providedIn: 'root',
})
export class TaskBootstrapServcie {
  private api = inject(TasksApiService);
  private runtimeStore = inject(TaskRuntimeStore);

  async initActiveSnapshot(): Promise<void> {
    const res = await firstValueFrom(this.api.active());
    for (const rt of res ?? []) {
      this.runtimeStore.setRuntime(rt);
    }
  }
}
