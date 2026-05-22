import type {
  ReimbursementItemInput,
  TravelReimbursementItemMeta,
} from '@app/features/reimbursement/models/reimbursement.model';

export type MoneyInput = string | number | null | undefined;
type TravelMetaCarrier = {
  meta?: TravelReimbursementItemMeta | Record<string, unknown> | null;
};

const MONEY_SCALE = 100;

const TRAVEL_META_KEYS: Array<keyof TravelReimbursementItemMeta> = [
  'days',
  'airfareAmount',
  'carriageAmount',
  'localTransportAmount',
  'lodgingAmount',
  'mealAllowanceAmount',
  'mealAmount',
  'otherAmount',
];

export function roundMoney(value: MoneyInput): number {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * MONEY_SCALE) / MONEY_SCALE;
}

export function parseMoneyInput(value: MoneyInput): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return value <= 0 ? 0 : roundMoney(value);
  }
  const normalized = value.trim().replace(/,/g, '');
  if (!normalized) {
    return 0;
  }
  const numeric = Number(normalized);
  return numeric <= 0 ? 0 : roundMoney(numeric);
}

export function sumMoney(values: Iterable<MoneyInput>): number {
  let total = 0;
  for (const value of values) {
    total += parseMoneyInput(value);
  }
  return roundMoney(total);
}

export function isPositiveMoney(value: MoneyInput): boolean {
  return parseMoneyInput(value) > 0;
}

export function travelMetaNumber(
  item: TravelMetaCarrier,
  key: keyof TravelReimbursementItemMeta
): number {
  const value = item.meta?.[key];
  return parseMoneyInput(typeof value === 'number' || typeof value === 'string' ? value : null);
}

export function travelSubtotal(item: TravelMetaCarrier): number {
  return sumMoney([
    travelMetaNumber(item, 'airfareAmount'),
    travelMetaNumber(item, 'carriageAmount'),
    travelMetaNumber(item, 'localTransportAmount'),
    travelMetaNumber(item, 'lodgingAmount'),
    travelMetaNumber(item, 'mealAllowanceAmount'),
    travelMetaNumber(item, 'mealAmount'),
    travelMetaNumber(item, 'otherAmount'),
  ]);
}

export function filterValidItems<T extends ReimbursementItemInput>(items: T[]): T[] {
  return items.filter((item) => {
    const hasText =
      Boolean(item.category?.trim()) ||
      Boolean(item.description?.trim()) ||
      Boolean(item.occurredDate?.trim()) ||
      Boolean(item.startDate?.trim()) ||
      Boolean(item.endDate?.trim()) ||
      Boolean(item.fromLocation?.trim()) ||
      Boolean(item.toLocation?.trim());

    const hasAmount = isPositiveMoney(item.amount);
    const hasTravelMeta = TRAVEL_META_KEYS.some((key) => isPositiveMoney(item.meta?.[key] as MoneyInput));

    return hasText || hasAmount || hasTravelMeta;
  });
}
