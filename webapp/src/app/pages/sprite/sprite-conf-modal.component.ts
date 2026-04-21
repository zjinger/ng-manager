import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectAssets, ProjectAssetSourceSvn } from '@models/project.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NZ_MODAL_DATA, NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { StepAdvanceComponent, StepBasicComponent, StepSummaryAsideComponent } from './components';
import { SpriteDraft } from './models/sprite-draft.model';
import { SpriteStateService } from './services/sprite-state.service';
import { SpriteConfig } from '@models/sprite.model';
import { UiNotifierService } from '@app/core';

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
  draft = signal<SpriteDraft>({ name: '', iconSvnPath: '', otherImagesSvnPath: '', localDir: '' });
  readonly nzModalData = inject<{ cfg: SpriteConfig }>(NZ_MODAL_DATA);
  readonly modalRef = inject(NzModalRef);
  private modal = inject(NzModalService);
  private state = inject(SpriteStateService);
  private notify = inject(UiNotifierService);
  constructor() {
    const p = this.state.project();
    if (p) {
      const iconsRepoUrl = p.assets?.iconsSvn?.url || '';
      const sourceId = p.assets?.iconsSvn?.id || '';
      const otherImageUrl = p.assets?.cutImageSvn?.url || '';
      const cfg = this.nzModalData.cfg;
      this.draft.update((d) => {
        d.name = p.name;
        d.sourceId = sourceId;
        d.iconSvnPath = iconsRepoUrl;
        d.otherImagesSvnPath = otherImageUrl;
        d.localDir = cfg?.localDir || '';
        d.cssPrefix = cfg?.prefix || 'sl';
        d.spriteUrl = cfg?.spriteUrl || '/assets/icons/{group}.png';
        d.template = cfg?.template || '<i class="{base} {class}"></i>';
        d.spriteExportDir = cfg?.spriteExportDir || '';
        d.lessExportDir = cfg?.lessExportDir || '';
        d.localImageRoot = cfg?.localImageRoot || '';
        return d;
      });
    }
  }
  canNext() {
    const s = this.step();
    const d = this.draft();
    if (s === 0) {
      const hasIconSvn = d.iconSvnPath?.trim();
      const hasLocalImage = d.localImageRoot?.trim();
      if (!hasIconSvn && !hasLocalImage) return false;
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

  async create() {
    if (this.creating()) return;
    this.creating.set(true);
    const d = this.draft();
    const assets: ProjectAssets = {};
    if (d.iconSvnPath?.trim()) {
      assets.iconsSvn = { kind: 'svn', url: d.iconSvnPath, label: 'icons', mode: 'manual', localDir: d.localDir, id: d.sourceId };
    }
    if (d.otherImagesSvnPath) {
      const cutImageId = this.state.project()?.assets?.cutImageSvn?.id || '';
      assets.cutImageSvn = { kind: 'svn', url: d.otherImagesSvnPath, label: 'images', mode: 'manual', localDir: d.localDir, id: cutImageId };
    }
    const nextCfg: Omit<SpriteConfig, "projectId" | "updatedAt"> = {
      enabled: true,
      persistLess: true,
      localDir: d.localDir,
      localImageRoot: d.localImageRoot || undefined,
      template: d.template || '<i class="{base} {class}"></i>',
      prefix: d.cssPrefix || 'sl',
      sourceId: d.sourceId || '',
      spriteUrl: d.spriteUrl || '/assets/icons/{group}.png',
      algorithm: 'binary-tree',
      spriteExportDir: d.spriteExportDir || '',
      lessExportDir: d.lessExportDir || '',
    }

    const cfg = await this.state.createConfig(assets, nextCfg);
    this.creating.set(false);
    this.notify.success("配置已保存");
    this.modalRef.close({ ok: true, cfg });
  }

  cancel() {
    this.modalRef.close();
    // this.modal.confirm({
    //   nzTitle: '取消',
    //   nzContent: '暂未保存，确定要取消吗',
    //   nzOkDanger: true,
    //   nzOkText: '是',
    //   nzCancelText: '否',
    //   nzCentered: true,
    //   nzOnOk: () => {
    //     this.modalRef.close();
    //   }
    // })
  }
}
