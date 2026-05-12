import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseSummary, TravelExpenseBasicInfo, TravelExpenseItem, formatTravelRoute } from '../../models';

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

@Component({
  selector: 'app-expense-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="back">
      <div class="back-scroll">
        <div class="back-div">
          <!-- <div style="width: 918px; height: 503px"> -->
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
                getDepartmentLabel(basicInfo().department)
              }}</span>
              <span style="margin-left: 76px; margin-right: 50px">填报日期：</span>
              <span class="typeface" style="display: inline-block; width: 43px; margin-right: 6px">
                {{ getYear(basicInfo().reportDate) }}
              </span>
              <span>年</span>
              <span class="typeface" style="width: 42px; display: inline-block; text-align: center">
                {{ getMonth(basicInfo().reportDate) }}
              </span>
              <span>月</span>
              <span class="typeface" style="width: 42px; display: inline-block; text-align: center">
                {{ getDay(basicInfo().reportDate) }}
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
                  {{ basicInfo().name || '-' }}
                </div>
                <div class="rowOne-title" style="width: 91px">职&nbsp;&nbsp;&nbsp;&nbsp;别</div>
                <div
                  class="typeface right-div"
                  style="width: 157px; height: 100%; text-align: center; border-right: 1px solid black"
                >
                  {{ basicInfo().position || '-' }}
                </div>
                <div class="rowOne-title" style="width: 94px">出差事由</div>
                <div style="width: 337px; height: 100%; text-align: center" class="typeface">
                  {{ basicInfo().travelReason || '-' }}
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
                    {{ getYear(basicInfo().startDate) }}
                  </span>
                  <span>年</span>
                  <span
                    style="width: 37px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ getMonth(basicInfo().startDate) }}
                  </span>
                  <span>月</span>
                  <span
                    style="width: 37px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ getDay(basicInfo().startDate) }}
                  </span>
                  <span>日</span>
                  <span
                    style="display: inline-block; width: 53px; text-align: center"
                    class="typeface"
                  >
                    {{ getTimeLabelByValue(basicInfo().startTime) }}
                  </span>
                  <span>起至</span>
                  <span
                    style="display: inline-block; width: 69px; text-align: center"
                    class="typeface"
                  >
                    {{ getYear(basicInfo().endDate) }}
                  </span>
                  <span>年</span>
                  <span
                    style="width: 37px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ getMonth(basicInfo().endDate) }}
                  </span>
                  <span>月</span>
                  <span
                    style="width: 37px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ getDay(basicInfo().endDate) }}
                  </span>
                  <span>日</span>
                  <span
                    style="display: inline-block; width: 53px; text-align: center"
                    class="typeface"
                  >
                    {{ getTimeLabelByValue(basicInfo().endTime) }}
                  </span>
                  <span>止&nbsp;共</span>
                  <span
                    style="width: 67px; display: inline-block; text-align: center"
                    class="typeface"
                  >
                    {{ basicInfo().travelDays || 0 }}
                  </span>
                  <span style="margin-right: 15px;">天</span>
                  <span>附单据</span>
                  <span
                    style="display: inline-block; width: 55px; text-align: center"
                    class="typeface"
                  >
                    {{ basicInfo().receiptCount || 0 }}
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

              <!-- 动态行数据 - 最多3行 -->
              @for (item of expenseItems(); track item.id; let idx = $index) {
              <div class="rowFour" [class.rowFive]="idx === 1" [class.rowSix]="idx === 2">
                <div class="dateVessel">
                  <div class="dateVesselO typeface">{{ getMonthFromDate(item.date) }}</div>
                  <div
                    style="width: 50%; display: flex; align-items: center; justify-content: center"
                    class="typeface"
                  >
                    {{ getDayFromDate(item.date) }}
                  </div>
                </div>
                <div class="place typeface">{{ formatTravelRoute(item.startEndLocation || []) }}</div>
                <div class="days typeface">{{ item.days || 0 }}</div>
                <div class="airFare typeface">{{ formatMoney(item.airfare) }}</div>
                <div class="carOrShip typeface">{{ formatMoney(item.transportation) }}</div>
                <div class="traffic typeface">{{ formatMoney(item.localTransport) }}</div>
                <div class="hotel typeface">{{ formatMoney(item.accommodation) }}</div>
                <div class="travel typeface">{{ formatMoney(item.mealAllowance) }}</div>
                <div class="meals typeface">0.00</div>
                <div class="other typeface">{{ formatMoney(item.other) }}</div>
                <div class="subtotal typeface">{{ formatMoney(item.subtotal) }}</div>
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
                  {{ totalDays() }}
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
                <div class="total typeface" style="color: black; width: 84px">0.00</div>
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
                    {{ formatMoney(summary().advanceAmount) }}
                  </span>
                </div>
                <span>元</span>
                <span style="margin-left: 20px">{{
                  summary().advanceAmount - grandTotal() >= 0 ? '应退' : '应补'
                }}</span>
                <div
                  class="boottom-div"
                  style="width: 88px; text-align: center; border-bottom: 1px solid black; height: 34px; margin-top: 10px"
                >
                  <span style="display: block; margin-top: -10px" class="typeface">
                    {{ formatMoney(Math.abs(summary().advanceAmount - grandTotal())) }}
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
  // 部门选项映射
  private readonly departmentMap: Record<string, string> = {
    tech: '技术部',
    product: '产品部',
    sales: '销售部',
    marketing: '市场部',
    hr: '人力资源部',
  };

  // 输入数据
  readonly basicInfo = input<TravelExpenseBasicInfo>({
    department: '',
    name: '',
    position: '',
    reportDate: '',
    travelReason: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    travelDays: 0,
    receiptCount: 0,
  });

  readonly expenseItems = input<TravelExpenseItem[]>([]);
  readonly summary = input<ExpenseSummary>({
    totalAmount: 0,
    advanceAmount: 0,
    differenceAmount: 0,
    attachments: [],
  });

  // 计算属性
  totalDays = computed(() => {
    return this.expenseItems().reduce((sum, item) => sum + (item.days || 0), 0);
  });

  totalAirfare = computed(() => {
    return this.expenseItems().reduce((sum, item) => sum + (item.airfare || 0), 0);
  });

  totalTransportation = computed(() => {
    return this.expenseItems().reduce((sum, item) => sum + (item.transportation || 0), 0);
  });

  totalLocalTransport = computed(() => {
    return this.expenseItems().reduce((sum, item) => sum + (item.localTransport || 0), 0);
  });

  totalAccommodation = computed(() => {
    return this.expenseItems().reduce((sum, item) => sum + (item.accommodation || 0), 0);
  });

  totalMealAllowance = computed(() => {
    return this.expenseItems().reduce((sum, item) => sum + (item.mealAllowance || 0), 0);
  });

  totalOther = computed(() => {
    return this.expenseItems().reduce((sum, item) => sum + (item.other || 0), 0);
  });

  grandTotal = computed(() => {
    return (
      this.totalAirfare() +
      this.totalTransportation() +
      this.totalLocalTransport() +
      this.totalAccommodation() +
      this.totalMealAllowance() +
      this.totalOther()
    );
  });

  chineseTotalAmount = computed(() => {
    return convertToChineseAmount(this.grandTotal());
  });

  // 辅助方法
  getDepartmentLabel(value: string): string {
    return this.departmentMap[value] || value || '-';
  }

  getYear(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[0] || '';
  }

  getMonth(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[1] || '';
  }

  getDay(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts[2] || '';
  }

  getMonthFromDate(date: Date | null): string {
    if (!date) return '';
    return (date.getMonth() + 1).toString();
  }

  getDayFromDate(date: Date | null): string {
    if (!date) return '';
    return date.getDate().toString();
  }

  getTimeLabelByValue(value: 'am' | 'pm' | ''): string {
    return TIME_LABEL_MAP[value] || '';
  }

  getChineseDigit(amount: number, position: number): string {
    const total = Math.floor(amount);
    const str = total.toString().padStart(7, '0');
    const digits = str.split('');
    if (position <= digits.length) {
      const num = parseInt(digits[position - 1]);
      return chineseNumbers[num];
    }
    return '零';
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0.00';
    return value.toFixed(2);
  }
  formatTravelRoute(routes: string[]): string {
    return formatTravelRoute(routes);
  }
  readonly Math = Math;
}
