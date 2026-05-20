import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CreateReimbursementClaimInput,
  ReimbursementItemInput,
  TravelReimbursementItemMeta,
} from '@app/features/reimbursement/models/reimbursement.model';

// 中文数字映射
const chineseNumbers = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];

// 转换为大写金额
function convertToChineseAmount(amount: number): string {
  if (amount === 0) return '零';
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  let result = '';
  let num = integerPart;
  if (num >= 10000) {
    const wan = Math.floor(num / 10000);
    result += convertToChineseNumber(wan) + '万';
    num = num % 10000;
  }
  if (num > 0) {
    result += convertToChineseNumber(num);
  }
  if (decimalPart > 0) {
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;
    if (jiao > 0) result += chineseNumbers[jiao] + '角';
    if (fen > 0) result += chineseNumbers[fen] + '分';
  } else {
    result += '元整';
  }
  return result;
}

function convertToChineseNumber(num: number): string {
  if (num === 0) return '';
  const units = ['', '拾', '佰', '仟'];
  let result = '';
  let str = num.toString();
  for (let i = 0; i < str.length; i++) {
    const digit = parseInt(str[i]);
    const unit = units[str.length - 1 - i];
    if (digit !== 0) {
      result += chineseNumbers[digit] + unit;
    } else if (i < str.length - 1 && parseInt(str[i + 1]) !== 0) {
      result += '零';
    }
  }
  return result;
}

// 时间映射
const TIME_LABEL_MAP: Record<string, string> = {
  am: '上午',
  pm: '下午',
};

// 格式化路线
function formatTravelRoute(
  fromLocation: string | null | undefined,
  toLocation: string | null | undefined
): string {
  const from = fromLocation || '';
  const to = toLocation || '';
  if (!from && !to) return '-';
  if (!from) return to;
  if (!to) return from;
  return `${from} → ${to}`;
}

interface ExpenseMeta {
  days: number | null;
  airfare: number | null;
  transportation: number | null;
  localTransport: number | null;
  accommodation: number | null;
  mealAllowance: number | null;
  mealExpenses: number | null;
  other: number | null;
}

@Component({
  selector: 'app-expense-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="back">
      <div class="back-scroll">
        <div class="back-div">
          <div class="expense-sheet">
            <div class="top-title">
              <div class="title">差旅费报销单</div>
              <div class="title-line-div">
                <div class="title-lineOne"></div>
                <div class="title-lineTwo"></div>
              </div>
            </div>

            <!-- 顶部 -->
            <div class="top-div">
              <span style="margin-left: 13px">报销部门：</span>
              <span style="display: inline-block; width: 128px" class="typeface">{{
                formData().departmentName || '-'
              }}</span>
              <span style="margin-left: 76px; margin-right: 50px">填报日期：</span>
              <span class="typeface" style="display: inline-block; width: 43px; margin-right: 6px">
                {{ getYear(formData().fillDate) }}
              </span>
              <span>年</span>
              <span class="typeface" style="width: 42px; display: inline-block; text-align: center">
                {{ getMonth(formData().fillDate) }}
              </span>
              <span>月</span>
              <span class="typeface" style="width: 42px; display: inline-block; text-align: center">
                {{ getDay(formData().fillDate) }}
              </span>
              <span>日</span>
            </div>

            <div class="container-div">
              <!-- 第一行 -->
              <div class="rowOne">
                <div class="rowOne-title" style="width: 88px">姓&nbsp;&nbsp;&nbsp;&nbsp;名</div>
                <div
                  class="typeface right-div"
                  style="width: 148px; height: 100%; text-align: center; border-right: 1px solid black"
                >
                  {{ formData().applicantName || '-' }}
                </div>
                <div class="rowOne-title" style="width: 91px">职&nbsp;&nbsp;&nbsp;&nbsp;别</div>
                <div
                  class="typeface right-div"
                  style="width: 157px; height: 100%; text-align: center; border-right: 1px solid black"
                >
                  {{ formData().titleName || '-' }}
                </div>
                <div class="rowOne-title" style="width: 94px">出差事由</div>
                <div style="width: 337px; height: 100%; text-align: center" class="typeface">
                  {{ formData().reason || '-' }}
                </div>
              </div>

              <!-- 第二行：出差起止日期 -->
              <div class="rowTwo">
                <div>
                  <span style="margin-left: 9px">出差起止日期自</span>
                  <span
                    style="display: inline-block; text-align: center; width: 71px"
                    class="typeface"
                  >
                    {{ getYear(formData().travelStartDate) }}
                  </span>
                  <span>年</span>
                  <span
                    style="width: 37px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ getMonth(formData().travelStartDate) }}
                  </span>
                  <span>月</span>
                  <span
                    style="width: 37px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ getDay(formData().travelStartDate) }}
                  </span>
                  <span>日</span>
                  <span
                    style="display: inline-block; width: 53px; text-align: center"
                    class="typeface"
                  >
                    {{ getTimeLabelByValue(formData().travelStartHalf) }}
                  </span>
                  <span>起至</span>
                  <span
                    style="display: inline-block; width: 69px; text-align: center"
                    class="typeface"
                  >
                    {{ getYear(formData().travelEndDate) }}
                  </span>
                  <span>年</span>
                  <span
                    style="width: 37px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ getMonth(formData().travelEndDate) }}
                  </span>
                  <span>月</span>
                  <span
                    style="width: 37px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ getDay(formData().travelEndDate) }}
                  </span>
                  <span>日</span>
                  <span
                    style="display: inline-block; width: 53px; text-align: center"
                    class="typeface"
                  >
                    {{ getTimeLabelByValue(formData().travelEndHalf) }}
                  </span>
                  <span>止&nbsp;共</span>
                  <span
                    style="width: 67px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ formData().travelDays || 0 }}
                  </span>
                  <span style="margin-right: 15px;">天</span>
                  <span>附单据</span>
                  <span
                    style="display: inline-block; width: 55px; text-align: center"
                    class="typeface"
                  >
                    {{ formData().receiptCount || 0 }}
                  </span>
                  <span>张</span>
                </div>
              </div>

              <!-- 表头 -->
              <div class="rowthree">
                <div class="rowthree-title" style="width: 75px">
                  <div class="rowthree-titleO">日&nbsp;期</div>
                  <div class="rowthree-titleT">
                    <div style="width: 50%; border-right: 1px solid black" class="right-div">
                      月
                    </div>
                    <div style="width: 50%">日</div>
                  </div>
                </div>
                <div class="rowthree-title" style="width: 163px">
                  起&nbsp;&nbsp;&nbsp;&nbsp;讫&nbsp;&nbsp;&nbsp;&nbsp;地&nbsp;&nbsp;&nbsp;&nbsp;点
                </div>
                <div class="rowthree-title" style="width: 52px">天&nbsp;数</div>
                <div class="rowthree-title" style="width: 70px">机&nbsp;票&nbsp;费</div>
                <div class="rowthree-title" style="width: 69px">车&nbsp;船&nbsp;费</div>
                <div class="rowthree-title" style="width: 82px">
                  <div style="height: 50%; line-height: 26px">
                    市&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;内
                  </div>
                  <div style="height: 50%; line-height: 26px">交&nbsp;通&nbsp;费</div>
                </div>
                <div class="rowthree-title" style="width: 72px">住&nbsp;宿&nbsp;费</div>
                <div class="rowthree-title" style="width: 85px">餐&nbsp;&nbsp;&nbsp;&nbsp;补</div>
                <div class="rowthree-title" style="width: 84px">餐&nbsp;&nbsp;&nbsp;&nbsp;费</div>
                <div class="rowthree-title" style="width: 65px">其&nbsp;&nbsp;他</div>
                <div class="rowthree-title" style="width: 97px; border-right: 0px">
                  小&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;计
                </div>
              </div>

              <!-- 动态行数据 -->
              @for (item of displayItems(); track item.id; let idx = $index) {
              <div class="rowFour" [class.rowFive]="idx === 1" [class.rowSix]="idx === 2">
                <div class="dateVessel">
                  <div class="dateVesselO typeface">{{ getMonthFromDate(item.occurredDate) }}</div>
                  <div
                    style="width: 50%; display: flex; align-items: center; justify-content: center"
                    class="typeface"
                  >
                    {{ getDayFromDate(item.occurredDate) }}
                  </div>
                </div>
                <div class="place typeface">
                  {{ formatTravelRoute(item.fromLocation, item.toLocation) }}
                </div>
                <div class="days typeface">{{ getMetaValue(item, 'days') }}</div>
                <div class="airFare typeface">
                  {{ formatMoney(getMetaValue(item, 'airfareAmount')) }}
                </div>
                <div class="carOrShip typeface">
                  {{ formatMoney(getMetaValue(item, 'carriageAmount')) }}
                </div>
                <div class="traffic typeface">
                  {{ formatMoney(getMetaValue(item, 'localTransportAmount')) }}
                </div>
                <div class="hotel typeface">
                  {{ formatMoney(getMetaValue(item, 'lodgingAmount')) }}
                </div>
                <div class="travel typeface">
                  {{ formatMoney(getMetaValue(item, 'mealAllowanceAmount')) }}
                </div>
                <div class="meals typeface">
                  {{ formatMoney(getMetaValue(item, 'mealAmount')) }}
                </div>
                <div class="other typeface">
                  {{ formatMoney(getMetaValue(item, 'otherAmount')) }}
                </div>
                <div class="subtotal typeface">{{ formatMoney(item.amount) }}</div>
              </div>
              }

              <!-- 合计行 -->
              <div class="rowSeven" style="height: 45px">
                <div class="dateVessel">
                  <div style="width: 50%; border-right: 1px solid black" class="right-div"></div>
                  <div style="width: 50%"></div>
                </div>
                <div
                  class="total"
                  style="font-family: 微软雅黑体; font-size: 16px; width: 163px;color: #00a0d5;"
                >
                  合&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;计
                </div>
                <div class="total typeface" style="color: black; width: 52px">
                {{ totalDays() === 0 ? '' : totalDays() }}
                </div>
                <div class="total typeface" style="color: black; width: 70px">
                  {{ formatMoney(totalAirfare()) }}
                </div>
                <div class="total typeface" style="color: black; width: 69px">
                  {{ formatMoney(totalTransportation()) }}
                </div>
                <div class="total typeface" style="color: black; width: 82px">
                  {{ formatMoney(totalLocalTransport()) }}
                </div>
                <div class="total typeface" style="color: black; width: 72px">
                  {{ formatMoney(totalAccommodation()) }}
                </div>
                <div class="total typeface" style="color: black; width: 85px">
                  {{ formatMoney(totalMealAllowance()) }}
                </div>
                <div class="total typeface" style="color: black; width: 84px">
                  {{ formatMoney(totalMealExpenses()) }}
                </div>
                <div class="total typeface" style="color: black; width: 65px">
                  {{ formatMoney(totalOther()) }}
                </div>
                <div
                  class="typeface"
                  style=" width: 97px; height: 100%; text-align: center; line-height: 45px"
                >
                  {{ formatMoney(grandTotal()) }}
                </div>
              </div>

              <!-- 第八行：大写金额和预支信息 -->
              <div class="rowEight">
                <span style="margin-left: 9px; margin-right: 7px;">总计金额（大写）</span>
                <span style="position: absolute; left: 174px; font-size: 17px" class="typeface">
                  {{ getChineseDigit(grandTotal(), 1) }}
                </span>
                <span style="margin-left: 49px">万</span>
                <span style="position: absolute; left: 217px; font-size: 17px" class="typeface">
                  {{ getChineseDigit(grandTotal(), 2) }}
                </span>
                <span style="margin-left: 27px">仟</span>
                <span style="position: absolute; left: 261px; font-size: 17px" class="typeface">
                  {{ getChineseDigit(grandTotal(), 3) }}
                </span>
                <span style="margin-left: 28px">佰</span>
                <span style="position: absolute; left: 304px; font-size: 17px" class="typeface">
                  {{ getChineseDigit(grandTotal(), 4) }}
                </span>
                <span style="margin-left: 26px">拾</span>
                <span style="position: absolute; left: 345px; font-size: 17px" class="typeface">
                  {{ getChineseDigit(grandTotal(), 5) }}
                </span>
                <span style="margin-left: 26px">元</span>
                <span style="position: absolute; left: 389px; font-size: 17px" class="typeface">
                  {{ getChineseDigit(grandTotal(), 6) }}
                </span>
                <span style="margin-left: 27px">角</span>
                <span style="position: absolute; left: 430px; font-size: 17px" class="typeface">
                  {{ getChineseDigit(grandTotal(), 7) }}
                </span>
                <span style="margin-left: 25px">分</span>
                <span style="margin-left: 27px">预支</span>
                <div
                  class="boottom-div"
                  style="width: 88px; text-align: center; border-bottom: 1px solid black; height: 34px; margin-top: 10px"
                >
                  <span style="display: block; margin-top: -10px" class="typeface">
                    {{ formatMoney(formData().advanceAmount) }}
                  </span>
                </div>
                <span>元</span>
                <span style="margin-left: 20px">{{
                  (formData().advanceAmount || 0) - grandTotal() >= 0 ? '应退' : '应补'
                }}</span>
                <div
                  class="boottom-div"
                  style="width: 88px; text-align: center; border-bottom: 1px solid black; height: 34px; margin-top: 10px"
                >
                  <span style="display: block; margin-top: -10px" class="typeface">
                    {{ formatMoney(Math.abs((formData().advanceAmount || 0) - grandTotal())) }}
                  </span>
                </div>
                <span>元</span>
              </div>
            </div>

            <!-- 底部 -->
            <div class="container-base">
              <span style="margin-left: 16px">负责人</span>
              <span style="margin-left: 109px">会计</span>
              <span style="margin-left: 94px">出纳</span>
              <span style="margin-left: 98px">审核</span>
              <span style="margin-left: 100px">部门主管</span>
              <span style="margin-left: 104px">出差人</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .typeface {
        color: black;
        font-family: 微软雅黑;
        font-size: 16px;
      }

      .back {
        position: relative;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 8px;
        -webkit-overflow-scrolling: touch;
        .back-scroll {
          width: fit-content;
          min-width: 100%;
          display: flex;
          justify-content: center;
        }
        .back-div {
          background-color: white;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          .expense-sheet {
            width: 918px;
            min-width: 918px;
            height: 503px;
          }
          .top-title {
            position: relative;
            margin-bottom: 2px;

            .title {
              color: #008dcd;
              text-align: center;
              font-family: 'SimSun', '宋体', serif;
              font-size: 26pt;
              font-weight: bold;
              letter-spacing: 11px;
            }

            .title-line-div {
              position: absolute;
              bottom: 4px;
              right: 33%;

              .title-lineOne {
                border-bottom: 1px solid black;
                width: 325px;
              }

              .title-lineTwo {
                border-bottom: 2px solid black;
                margin-top: 1px;
                width: 325px;
              }
            }
          }

          .top-div {
            font-family: 微软雅黑体;
            color: #00a0d5;
            font-size: 16px;
            height: 32px;
            display: flex;
            align-items: flex-end;
            margin-bottom: 2px;
          }

          .container-div {
            width: 100%;
            min-height: 382px;
            border: 2px solid black;

            .rowOne {
              width: 100%;
              border-bottom: 1px solid black;
              display: flex;
              height: 45px;
              line-height: 45px;

              .rowOne-title {
                font-family: 微软雅黑体;
                color: #00a0d5;
                font-size: 16px;
                height: 100%;
                text-align: center;
                border-right: 1px solid black;
              }
            }

            .rowTwo {
              width: 100%;
              border-bottom: 1px solid black;
              height: 45px;
              font-family: 微软雅黑体;
              color: #00a0d5;
              font-size: 16px;
              display: flex;
              flex-wrap: wrap;
              align-content: center;
            }

            .rowthree {
              width: 100%;
              border-bottom: 1px solid black;
              display: flex;
              height: 52px;
              line-height: 52px;

              .rowthree-title {
                font-family: 微软雅黑体;
                color: #00a0d5;
                font-size: 16px;
                height: 100%;
                text-align: center;
                border-right: 1px solid black;

                .rowthree-titleO {
                  border-bottom: 1px solid black;
                  height: 24px;
                  width: 100%;
                  line-height: 24px;
                }

                .rowthree-titleT {
                  height: 28px;
                  width: 100%;
                  line-height: 28px;
                  display: flex;
                }
              }
            }

            .rowFour,
            .rowFive,
            .rowSix,
            .rowSeven {
              width: 100%;
              border-bottom: 1px solid black;
              display: flex;
              height: 42px;
            }

            .rowSeven {
              .total {
                height: 100%;
                text-align: center;
                line-height: 45px;
                border-right: 1px solid black;
              }
            }

            .rowEight {
              width: 100%;
              display: flex;
              height: 63px;
              line-height: 63px;
              font-family: 微软雅黑体;
              color: #00a0d5;
              font-size: 16px;
              position: relative;
            }
          }

          .container-base {
            font-family: 微软雅黑体;
            color: #00a0d5;
            font-size: 16px;
            margin-top: 8px;
          }
        }

        .dateVessel {
          display: flex;
          width: 75px;
          height: 100%;
          text-align: center;
          border-right: 1px solid black;

          .dateVesselO {
            width: 50%;
            border-right: 1px solid black;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        .place {
          width: 163px;
          height: 100%;
          text-align: center;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .days {
          width: 52px;
          height: 100%;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .airFare {
          width: 70px;
          height: 100%;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .carOrShip {
          width: 69px;
          height: 100%;
          text-align: center;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .traffic {
          width: 82px;
          height: 100%;
          text-align: center;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hotel {
          width: 72px;
          height: 100%;
          text-align: center;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .travel {
          width: 85px;
          height: 100%;
          text-align: center;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .meals {
          width: 84px;
          height: 100%;
          text-align: center;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .other {
          width: 65px;
          height: 100%;
          border-right: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .subtotal {
          color: black;
          width: 97px;
          height: 100%;
          text-align: center;
          line-height: 42px;
        }
      }
      /* ========== 暗色主题适配 ========== */
      :host-context(html[data-theme='dark']) {
        .typeface {
          color: var(--text-primary-dark, #e2e8f0);
        }

        .back-div {
          background-color: var(--bg-container-dark, #1e293b);
          padding: 10px;
        }

        .title-lineOne,
        .title-lineTwo {
          border-bottom-color: var(--border-color-dark, #334155) !important;
        }

        .container-div {
          border-color: var(--border-color-dark, #334155) !important;
        }

        .rowOne,
        .rowTwo,
        .rowthree,
        .rowFour,
        .rowFive,
        .rowSix,
        .rowSeven,
        .rowEight {
          border-bottom-color: var(--border-color-dark, #334155) !important;
        }

        .rowOne .rowOne-title,
        .rowthree .rowthree-title,
        .dateVessel,
        .dateVesselO,
        .place,
        .days,
        .airFare,
        .carOrShip,
        .traffic,
        .hotel,
        .travel,
        .meals,
        .other,
        .rowSeven .total {
          border-right-color: var(--border-color-dark, #334155) !important;
          color: var(--text-primary-dark, #e2e8f0) !important;
        }

        .rowthree-titleO {
          border-bottom-color: var(--border-color-dark, #334155) !important;
        }

        .total.typeface,
        .subtotal {
          color: var(--text-primary-dark, #e2e8f0);
        }
        .boottom-div {
          border-bottom-color: var(--border-color-dark, #334155) !important;
        }
        .right-div {
          border-right-color: var(--border-color-dark, #334155) !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensePreviewComponent {
  // 输入数据 - 使用完整的表单数据
  readonly formData = input<CreateReimbursementClaimInput>({
    claimType: 'travel',
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

  // 行程明细
  readonly items = computed(() => this.formData().items || []);

  // 获取 meta 中的值
  getMetaValue(item: ReimbursementItemInput, key: keyof TravelReimbursementItemMeta): number {
    const meta = item.meta as any;
    return meta?.[key] ?? null;
  }

  // 计算属性
  totalDays = computed(() => {
    return this.items().reduce((sum, item) => sum + (this.getMetaValue(item, 'days') || 0), 0);
  });

  totalAirfare = computed(() => {
    return this.items().reduce(
      (sum, item) => sum + (this.getMetaValue(item, 'airfareAmount') || 0),
      0
    );
  });

  totalTransportation = computed(() => {
    return this.items().reduce(
      (sum, item) => sum + (this.getMetaValue(item, 'carriageAmount') || 0),
      0
    );
  });

  totalLocalTransport = computed(() => {
    return this.items().reduce(
      (sum, item) => sum + (this.getMetaValue(item, 'localTransportAmount') || 0),
      0
    );
  });

  totalAccommodation = computed(() => {
    return this.items().reduce(
      (sum, item) => sum + (this.getMetaValue(item, 'lodgingAmount') || 0),
      0
    );
  });

  totalMealAllowance = computed(() => {
    return this.items().reduce(
      (sum, item) => sum + (this.getMetaValue(item, 'mealAllowanceAmount') || 0),
      0
    );
  });

  totalMealExpenses = computed(() => {
    return this.items().reduce(
      (sum, item) => sum + (this.getMetaValue(item, 'mealAmount') || 0),
      0
    );
  });

  totalOther = computed(() => {
    return this.items().reduce(
      (sum, item) => sum + (this.getMetaValue(item, 'otherAmount') || 0),
      0
    );
  });

  grandTotal = computed(() => {
    return this.items().reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  // 辅助方法 - 处理 null 和 undefined
  getYear(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[0] || '';
  }

  getMonth(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[1] || '';
  }

  getDay(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[2] || '';
  }

  getMonthFromDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[1] || '';
  }

  getDayFromDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[2] || '';
  }

  getTimeLabelByValue(value: 'am' | 'pm' | null | undefined): string {
    if (!value) return '';
    return TIME_LABEL_MAP[value] || '';
  }
// 创建空行的工厂函数
private createEmptyItem(id: string): ReimbursementItemInput {
  return {
    id: id,
    itemType: 'travel',
    category: null,
    description: null,
    occurredDate: null,
    startDate: null,
    endDate: null,
    fromLocation: null,
    toLocation: null,
    amount: 0,
    meta: null,
  };
}

// 始终显示3行的行程明细
readonly displayItems = computed(() => {
  const actualItems = this.items();
  const targetRowCount = 3;
  const displayList = [...actualItems];
  
  for (let i = displayList.length; i < targetRowCount; i++) {
    displayList.push(this.createEmptyItem(`empty-${i}`));
  }
  
  return displayList;
});
  getChineseDigit(amount: number, position: number): string {
    const total = Math.floor(amount);
    // 金额单位顺序：万、仟、佰、拾、元、角、分
    const wan = Math.floor(total / 10000);
    const remainder = total % 10000;
    const qian = Math.floor(remainder / 1000);
    const bai = Math.floor((remainder % 1000) / 100);
    const shi = Math.floor((remainder % 100) / 10);
    const yuan = remainder % 10;

    const decimalPart = Math.round((amount - total) * 100);
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;

    const digits: Record<number, number> = {
      1: wan, // 万
      2: qian, // 仟
      3: bai, // 佰
      4: shi, // 拾
      5: yuan, // 元
      6: jiao, // 角
      7: fen, // 分
    };

    const num = digits[position];
    // 特殊处理：万位为0时不显示，但为了保持位置，返回空字符串
    if (position === 1 && num === 0 && total < 10000) {
      return '零';
    }
    return chineseNumbers[num] || '零';
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined || value === 0) {
      return '';
    }
    return value.toFixed(2);
  }

  formatTravelRoute(
    fromLocation: string | null | undefined,
    toLocation: string | null | undefined
  ): string {
    return formatTravelRoute(fromLocation, toLocation);
  }

  readonly Math = Math;
}
