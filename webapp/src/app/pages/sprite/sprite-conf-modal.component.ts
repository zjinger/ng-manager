import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { StepAdvanceComponent, StepBasicComponent, StepSummaryAsideComponent } from './components';
import { SpriteDraft } from './models/sprite-draft.model';

@Component({
  selector: 'app-sprite-conf-modal',
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzCardModule,
    NzGridModule,
    NzStepsModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzSpinModule,
    StepBasicComponent,
    StepAdvanceComponent,
    StepSummaryAsideComponent,
  ],
  template: `
    <div nz-row nzJustify="center" >
      <div nz-col nzSpan="16">
        <nz-steps [nzCurrent]="step()">
            <nz-step nzTitle="详情"></nz-step>
            <nz-step nzTitle="配置"></nz-step>
        </nz-steps>
      </div>
    </div>
    <div nz-row nzJustify="start" >
      <div nz-col nzSpan="24">
        <nz-spin [nzSpinning]="creating()">
        <div class="content">
            <div class="main">
              @switch(step()){ @case(0){
                <app-step-basic [draft]="draft()" />
                } @case(1){
                <app-step-advance [draft]="draft()" />
                }
              }
            <div class="actions">
                @if(step()===0){
                  <button nz-button (click)="cancel()">
                    <nz-icon nzType="close" nzTheme="outline" />
                    取消
                  </button>
                }
                @if(step() > 0){
                  <button nz-button (click)="prev()">
                    <nz-icon nzType="arrow-left" nzTheme="outline" />
                    上一步
                  </button>
                }
                @if(canCreateHere()){
                  <button nz-button nzType="primary" (click)="create()" >
                    <nz-icon nzType="check" nzTheme="outline" />
                    确定
                  </button>
                } @else {
                  <button nz-button nzType="primary" (click)="next()" [disabled]="!canNext() ">
                    下一步
                    <nz-icon nzType="arrow-right" nzTheme="outline" />
                  </button>
                }
              </div>
          </div>
          <div class="aside">
            <app-step-summary-aside [draft]="draft()" />
          </div>
        </div>
        </nz-spin>
      </div>
    </div>
  `,
  styles: [
    `
    .content {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 16px;
      margin-top: 16px;
    }

    .main {
      min-height: 420px;
    }

    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 18px;
    }

    .aside {
      position: sticky;
      top: 16px;
      height: fit-content;
    }
    `
  ],
})
export class SpriteConfModalComponent {
  step = signal(0);
  creating = signal(false);
  draft = signal<SpriteDraft>({ name: '', iconSvnPath: '', otherImagesSvnPath: '', cssPrefix: 'sl', spriteUrl: '/assets/icons/{group}.png', template: '<i class="{base} {class}" ></i>' });

  readonly modalRef = inject(NzModalRef);
  private modal = inject(NzModalService);

  canNext() {
    const s = this.step();
    const d = this.draft();
    if (s === 0) {
      // if (!d.name?.trim()) return false;
      if (!d.iconSvnPath?.trim()) return false;
      return true;
    }
    return true;
  }

  next() {
    this.step.update((s) => s + 1);
  }

  prev() {
    this.step.update((s) => s - 1);
  }

  canCreateHere() {
    return this.step() === 1;
  }

  create() {
    if (this.creating()) return;
    this.creating.set(true);
    setTimeout(() => {
      this.creating.set(false);
      this.modalRef.close(this.draft()); 
    }, 2000);
  }

  cancel() {
    this.modal.confirm({
      nzTitle: '取消',
      nzContent: '暂未保存，确定要取消吗',
      nzOkDanger: true,
      nzOkText: '是',
      nzCancelText: '否',
      nzCentered: true,
      nzOnOk: () => {
        this.modalRef.close();
      }
    })
  }
}
