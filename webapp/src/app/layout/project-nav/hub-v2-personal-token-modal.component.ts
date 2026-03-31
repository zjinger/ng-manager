import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ProjectStateService } from '@pages/projects/services/project.state.service';

@Component({
  selector: 'app-hub-v2-personal-token-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzModalModule],
  template: `
    <nz-modal
      [nzVisible]="visible"
      [nzClosable]="false"
      [nzMaskClosable]="false"
      nzTitle="Hub V2 Personal Token（全局）"
      [nzWidth]="560"
      (nzOnCancel)="close()"
    >
      <ng-container *nzModalContent>
        <div class="modal-body">
          <label class="label">Personal Token</label>
          <nz-input-wrapper>
            <input
              nz-input
              type="password"
              [(ngModel)]="draft"
              placeholder="粘贴 ngm_uptk_xxx"
            />
            <nz-icon nzInputPrefix nzType="safety-certificate" nzTheme="outline" />
          </nz-input-wrapper>
          <div class="hint">仅保存在当前浏览器本地，用于 webapp 调用 Hub V2 /api/personal。</div>
        </div>
      </ng-container>
      <ng-container *nzModalFooter>
        <button nz-button (click)="clear()">清空</button>
        <button nz-button (click)="close()">取消</button>
        <button nz-button nzType="primary" (click)="save()">保存</button>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    .modal-body { display: grid; gap: 12px; }
    .hint { font-size: 12px; opacity: .75; }
  `]
})
export class HubV2PersonalTokenModalComponent {
  private projectState = inject(ProjectStateService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  draft = '';

  open(): void {
    this.draft = this.projectState.getHubV2PersonalToken();
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  save(): void {
    this.projectState.setHubV2PersonalToken(this.draft);
    this.visibleChange.emit(false);
  }

  clear(): void {
    this.projectState.setHubV2PersonalToken('');
    this.draft = '';
  }
}
