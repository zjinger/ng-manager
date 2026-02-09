import { Injectable, inject } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { firstValueFrom } from 'rxjs';
import type {
  ApiCollectionCreateBody,
  ApiCollectionKind,
  ApiCollectionTreeNode,
  ApiCollectionUpdateBody,
} from '@models/api-client';
import { CollectionModalComponent } from '../components/request-collections/collection-modal.component';

@Injectable({ providedIn: 'root' })
export class CollectionModalService {
  private modal = inject(NzModalService);

  async createCollection(opts: {
    kind: 'collection' | 'folder';
    createBody: ApiCollectionCreateBody;
    nodes: ApiCollectionTreeNode[];
    initialParentId?: string | null; // 纯 id
  }): Promise<ApiCollectionCreateBody | null> {
    const ref = this.modal.create<CollectionModalComponent, any, any>({
      nzTitle: opts.kind === 'folder' ? '新建目录' : '新建集合',
      nzContent: CollectionModalComponent,
      nzFooter: null,
      nzWidth: 520,
      nzMaskClosable: false,
      nzData: {
        mode: 'create',
        createBody: opts.createBody,
        nodes: opts.nodes,
      },
    });
    return await firstValueFrom(ref.afterClose);
  }

  async renameCollection(opts: {
    kind: ApiCollectionKind;
    nodes: ApiCollectionTreeNode[];
    targetId: string;
    initialName: string;
  }): Promise<ApiCollectionUpdateBody | null> {
    const ref = this.modal.create<CollectionModalComponent, any, any>({
      nzTitle: '重命名',
      nzContent: CollectionModalComponent,
      nzFooter: null,
      nzWidth: 520,
      nzMaskClosable: false,
      nzData: {
        mode: 'rename',
        kind: opts.kind,
        nodes: opts.nodes,
        targetId: opts.targetId,
        initialName: opts.initialName,
      },
    });
    return await firstValueFrom(ref.afterClose);
  }

  async moveTarget(opts: {
    nodes: ApiCollectionTreeNode[];
    target: { kind: ApiCollectionKind; id: string };
    initialParentId?: string | null; // 纯 id
  }): Promise<{ parentId: string | null } | null> {
    const ref = this.modal.create<CollectionModalComponent, any, any>({
      nzTitle: '移动到',
      nzContent: CollectionModalComponent,
      nzFooter: null,
      nzWidth: 520,
      nzMaskClosable: false,
      nzData: {
        mode: 'move',
        nodes: opts.nodes,
        target: opts.target,
        initialParentId: opts.initialParentId ?? null,
      },
    });
    return await firstValueFrom(ref.afterClose);
  }

  async pickCollection(opts: {
    nodes: ApiCollectionTreeNode[];
  }): Promise<{ parentId: string | null } | null> {
    const ref = this.modal.create<CollectionModalComponent, any, any>({
      nzTitle: '选择集合/目录',
      nzContent: CollectionModalComponent,
      nzFooter: null,
      nzWidth: 520,
      nzMaskClosable: false,
      nzData: {
        mode: 'pick',
        nodes: opts.nodes,
      },
    });
    return await firstValueFrom(ref.afterClose);
  }
}
