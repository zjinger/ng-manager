import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';
import type { ReimbursementClaimType } from '@app/features/reimbursement/models/reimbursement.model';
import { AddExpense } from '../add-expense/add-expense';
import { AddTravelExpense } from '../add-travel-expense/add-travel-expense';

@Component({
  selector: 'app-reimbursement-edit-page',
  standalone: true,
  imports: [CommonModule, NzSpinModule, AddExpense, AddTravelExpense],
  template: `
    @if (loading()) {
      <div class="edit-loading">
        <nz-spin nzTip="加载报销单..." />
      </div>
    } @else if (claimType() === 'general') {
      <app-add-expense />
    } @else if (claimType() === 'travel') {
      <app-add-travel-expense />
    }
  `,
  styles: [
    `
      .edit-loading {
        min-height: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly message = inject(NzMessageService);

  readonly loading = signal(true);
  readonly claimType = signal<ReimbursementClaimType | null>(null);

  ngOnInit(): void {
    const claimId = this.route.snapshot.paramMap.get('claimId');
    if (!claimId) {
      this.message.error('缺少报销单ID');
      this.loading.set(false);
      return;
    }
    this.reimbursementApi.getClaimById(claimId).subscribe({
      next: (detail) => {
        this.claimType.set(detail.claimType);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('加载报销单失败');
        this.loading.set(false);
      },
    });
  }
}
