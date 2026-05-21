import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CreateReimbursementClaimInput,
  ReimbursementItemInput,
} from '@app/features/reimbursement/models/reimbursement.model';

// 中文数字映射
const chineseNumbers = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];

// 获取大写金额数字
function getChineseDigit(amount: number, position: number): string {
  const total = Math.floor(amount);
  const str = total.toString().padStart(7, '0');

  if (position <= str.length) {
    const num = parseInt(str[position], 10);
    return chineseNumbers[num];
  }

  return '零';
}

// 获取角分
function getDecimalPart(amount: number, type: 'jiao' | 'fen'): string {
  const decimal = Math.round((amount - Math.floor(amount)) * 100);

  if (type === 'jiao') {
    const jiao = Math.floor(decimal / 10);
    return chineseNumbers[jiao] || '零';
  }

  const fen = decimal % 10;
  return chineseNumbers[fen] || '零';
}

@Component({
  selector: 'app-expense-bill-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <div class="middle-table">
      <div class="back">
        <!-- 标题 -->
        <div class="title">
          <div class="headerCell">费用报销单</div>

          <div class="border-b" style="border-bottom: 1px solid black; width: 300px"></div>

          <div
            class="border-b"
            style="
              border-bottom: 2px solid black;
              margin-top: 1px;
              width: 300px;
            "
          ></div>
        </div>

        <div class="section">
          <!-- 顶部 -->
          <div class="top">
            <span>报销部门：</span>

            <div class="text" style="text-align: left">
              {{ formData().departmentName || '-' }}
            </div>
            <section style="display: flex; align-items: center;">
              <div class="text" style="width: 100px">
                {{ getYear(formData().fillDate) }}
              </div>

              <span>年</span>

              <div class="text" style="width: 60px">
                {{ getMonth(formData().fillDate) }}
              </div>

              <span>月</span>

              <div class="text" style="width: 60px">
                {{ getDay(formData().fillDate) }}
              </div>

              <span>日</span>

              <span style="margin-left: 5px">填</span>
            </section>

            <span>单据及附件共</span>

            <div class="input-page border-b">
              {{ formData().receiptCount || 0 }}
            </div>

            <span>页</span>
          </div>

          <!-- 表格 -->
          <table frame="border" rules="all">
            <!-- 表头 -->
            <tr>
              <td style="width: 270px">
                <div class="centralizer" style="width: 150px">
                  <span>用</span>
                  <span>途</span>
                </div>
              </td>

              <td style="width: 189px">
                <div class="centralizer">
                  <span>金</span>
                  <span>额（元）</span>
                </div>
              </td>

              <td style="width: 50px" rowspan="3">
                <div class="centralizer-cols" style="height: 75px">
                  <span>备</span>
                  <span>注</span>
                </div>
              </td>

              <td style="width: 370px" colspan="3" rowspan="3">
                <textarea readonly>{{ formData().reason || '' }}</textarea>
              </td>
            </tr>

            <!-- 明细 -->
            @for (item of displayItems(); track item.id; let idx = $index) {
            <tr>
              <!-- 用途 -->
              <td>
                {{ getItemDescription(item) || '' }}
              </td>

              <!-- 金额 -->
              <td>
                {{ formatMoney(getItemAmount(item)) }}
              </td>

              <!-- 第3行插入审批区域 -->
              @if (idx === 2) {
              <!-- 部门审核 -->
              <td rowspan="3">
                <div class="centralizer-cols" style="height: 118px">
                  <span>部</span>
                  <span>门</span>
                  <span>审</span>
                  <span>核</span>
                </div>
              </td>

              <!-- 部门审核签字 -->
              <td rowspan="3" style="width: 159.5px"></td>

              <!-- 领导审批 -->
              <td rowspan="3" style="width: 50px">
                <div class="centralizer-cols" style="height: 118px">
                  <span>领</span>
                  <span>导</span>
                  <span>审</span>
                  <span>批</span>
                </div>
              </td>

              <!-- 领导审批签字 -->
              <td rowspan="3" style="width: 159.5px"></td>
              }
            </tr>
            }

            <!-- 合计 -->
            <tr>
              <td>
                <div class="centralizer">
                  <span>合</span>
                  <span>计</span>
                </div>
              </td>

              <td>
                {{ formatMoney(totalAmount()) }}
              </td>
            </tr>

            <!-- 金额大写 -->
            <tr>
              <td colspan="2" class="caption">
                <label>金额大写:</label>

                <span>{{ getChineseDigit(totalAmount(), 1) }}</span>
                <label>拾</label>

                <span>{{ getChineseDigit(totalAmount(), 2) }}</span>
                <label>万</label>

                <span>{{ getChineseDigit(totalAmount(), 3) }}</span>
                <label>仟</label>

                <span>{{ getChineseDigit(totalAmount(), 4) }}</span>
                <label>佰</label>

                <span>{{ getChineseDigit(totalAmount(), 5) }}</span>
                <label>拾</label>

                <span>{{ getChineseDigit(totalAmount(), 6) }}</span>
                <label>元</label>

                <span>{{ getDecimalPart(totalAmount(), 'jiao') }}</span>
                <label>角</label>

                <span>{{ getDecimalPart(totalAmount(), 'fen') }}</span>
                <label>分</label>
              </td>

              <td colspan="2" class="caption">
                <label>预支:</label>

                <span style="width: 70px">
                  {{ formatMoneyOrZero(formData().advanceAmount) }}
                </span>

                <label>元</label>
              </td>

              <td colspan="2" class="caption">
                <label>
                  {{ (formData().advanceAmount || 0) - totalAmount() >= 0 ? '应退' : '应补' }}
                </label>

                <span style="width: 70px">
                  {{ formatMoney(Math.abs((formData().advanceAmount || 0) - totalAmount())) }}
                </span>

                <label>元</label>
              </td>
            </tr>
          </table>

          <!-- 底部签名 -->
          <div class="footer">
            <span>会计主管</span>

            <span>会计</span>

            <span>出纳</span>

            <span style="margin-right: 30px">
              报销人

              <span class="reimburser border-b">
                {{ formData().applicantName || '' }}
              </span>
            </span>

            <span>领款人</span>
          </div>
        </div>
      </div>
    </div>
  `,

  styles: [
    `
      .middle-table {
        color: black;
        width: 100%;
        /* min-height: 714px;
        background: #0b141f; */
        /* border: 1px solid rgba(34, 58, 87, 1); */
        border-radius: 2px;

        display: flex;
        align-items: center;
        justify-content: center;

        .back {
          /* width: 1089px;
          min-height: 633px; */

          background: white;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-around;

          padding: 20px;

          .title {
            margin-bottom: 10px;

            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;

            .headerCell {
              width: 275px;

              font-size: 32px;
              font-weight: 500;

              color: rgb(0, 141, 205);

              text-align: center;
              text-align-last: justify;
            }
          }

          .section {
            width: 100%;
            max-width: 880px;

            .top {
              display: flex;
              align-items: center;
              flex-wrap: wrap;
              justify-content: space-between;
              gap: 4px;

              text-align: center;

              margin-bottom: 3px;

              span {
                color: rgb(0, 160, 213);
              }

              .input-page {
                width: 50px;
                height: 25px;

                border-bottom: 1px solid black;

                text-align: center;
              }
            }

            table {
              width: 100%;

              border-collapse: collapse;
              border: 2px solid black;

              tr {
                td {
                  height: 55px;

                  border: 1px solid black;

                  text-align: center;

                  padding: 4px 8px;

                  textarea {
                    width: 98%;
                    height: 90%;

                    border: none;
                    outline: none;

                    resize: none;

                    background: transparent;
                  }

                  .centralizer {
                    width: 100px;

                    display: flex;
                    justify-content: space-between;

                    margin: auto;

                    color: rgb(0, 160, 213);
                  }

                  .centralizer-cols {
                    height: 100%;

                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;

                    color: rgb(0, 160, 213);
                  }
                }

                .caption {
                  span {
                    width: 23px;

                    display: inline-block;

                    text-align: center;

                    margin-right: 5px;
                  }

                  label {
                    color: rgb(0, 160, 213);

                    &:first-child {
                      margin-left: 10px;
                      margin-right: 25px;
                    }
                  }
                }
              }
            }

            .footer {
              margin-top: 16px;

              display: flex;
              justify-content: space-around;
              flex-wrap: wrap;

              span {
                color: rgb(0, 160, 213);

                .reimburser {
                  width: 100px;

                  display: inline-block;

                  margin-left: 10px;

                  border-bottom: 1px solid #000;

                  color: black;

                  text-align: center;
                }
              }
            }
          }
        }
      }
      /* ========== 暗色主题适配 ========== */
      :host-context(html[data-theme='dark']) {
        .middle-table {
          .back {
            background: var(--bg-container-dark, #1e293b);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

            .title {
              .title-line-one,
              .title-line-two {
                border-bottom-color: var(--border-color-dark, #475569);
              }
            }

            .section {
              .top {
                .dept-name,
                .year,
                .month,
                .day,
                .text,
                .input-page {
                  color: var(--text-primary-dark, #e2e8f0);
                }
              }

              table {
                border-color: var(--border-color-dark, #475569);

                tr {
                  td {
                    border-color: var(--border-color-dark, #334155);
                    color: var(--text-primary-dark, #e2e8f0);

                    textarea {
                      color: var(--text-primary-dark, #e2e8f0);
                    }
                  }

                  .purpose-cell,
                  .amount-cell {
                    color: var(--text-primary-dark, #e2e8f0);
                  }

                  .total-label-cell,
                  .total-amount-cell {
                    color: var(--text-primary-dark, #e2e8f0);
                  }

                  .caption {
                    span {
                      color: var(--text-primary-dark, #e2e8f0);
                    }

                    .advance-amount,
                    .difference-amount {
                      color: var(--text-primary-dark, #e2e8f0);
                    }
                  }

                  .sign-cell {
                    background: transparent;
                  }
                }
              }

              .footer {
                .reimburser {
                  border-bottom-color: var(--border-color-dark, #475569);
                  color: var(--text-primary-dark, #e2e8f0);
                }
              }
            }
            .border-b {
              border-color: var(--border-color-dark, #334155) !important;
            }
          }
        }
      }
    `,
  ],
})
export class ExpenseBillPreviewComponent {
  // 输入数据 - 使用完整的表单数据
  readonly formData = input<CreateReimbursementClaimInput>({
    claimType: 'general',
    departmentId: '',
    departmentName: '',
    applicantName: '',
    titleName: '',
    reason: '',
    fillDate: '',
    advanceAmount: 0,
    travelStartDate: null,
    travelStartHalf: null,
    travelEndDate: null,
    travelEndHalf: null,
    travelDays: null,
    receiptCount: null,
    items: [],
  });

  // 费用明细项
  readonly items = computed(() => this.formData().items || []);

  // 总金额
  readonly totalAmount = computed(() => {
    return this.items().reduce((sum, item) => {
      return sum + (item.amount || 0);
    }, 0);
  });

  // 显示行（固定4行）
  readonly displayItems = computed(() => {
    const actualItems = [...this.items()];
    const targetRowCount = 4;

    if (actualItems.length < targetRowCount) {
      const emptyCount = targetRowCount - actualItems.length;
      for (let i = 0; i < emptyCount; i++) {
        actualItems.push({
          id: `empty-${i}`,
          itemType: 'general',
          occurredDate: null,
          fromLocation: '',
          toLocation: '',
          amount: 0,
          meta: null,
          sort: 0,
          description: '',
        } as ReimbursementItemInput);
      }
    }

    return actualItems;
  });

  /**
   * 获取费用用途描述
   */
  getItemDescription(item: ReimbursementItemInput): string {
    return item.description || '';
  }

  /**
   * 获取费用金额
   */
  getItemAmount(item: ReimbursementItemInput): number | null {
    return item.amount ?? null;
  }

  getYear(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    return dateStr.split('-')[0] || '';
  }

  getMonth(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    return dateStr.split('-')[1] || '';
  }

  getDay(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    return dateStr.split('-')[2] || '';
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined || value === 0) {
      return '';
    }

    return Number(value).toFixed(2);
  }

  formatMoneyOrZero(value: number | null | undefined): string {
    return Number(value ?? 0).toFixed(2);
  }

  getChineseDigit(amount: number, position: number): string {
    return getChineseDigit(amount, position);
  }

  getDecimalPart(amount: number, type: 'jiao' | 'fen'): string {
    return getDecimalPart(amount, type);
  }

  readonly Math = Math;
}
