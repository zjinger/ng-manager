import fs from "node:fs";
import path from "node:path";
import Docxtemplater from "docxtemplater";

import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { ReimbursementClaimDetail, ReimbursementItemEntity } from "./reimbursement.types";

const JSZip = require("jszip");

export type ReimbursementTemplateType = "0" | "1" | "2";

const WORD_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;
const TRAVEL_ROW_SUFFIXES = ["1", "2", "3"] as const;

type TemplateData = Record<string, string | number>;

export interface RenderedReimbursementWord {
  fileName: string;
  mimeType: typeof WORD_MIME_TYPE;
  buffer: Buffer;
  templateType: ReimbursementTemplateType;
}

export function renderReimbursementWord(claim: ReimbursementClaimDetail): RenderedReimbursementWord {
  const templateType = resolveTemplateType(claim.balanceAmount);
  const templatePath = resolveTemplatePath(claim.claimType, templateType);
  if (!fs.existsSync(templatePath)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `reimbursement word template not found: ${templatePath}`, 404);
  }

  const content = fs.readFileSync(templatePath, "binary");
  const zip = new JSZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(claim.claimType === "travel" ? buildTravelData(claim) : buildGeneralData(claim));

  return {
    fileName: `${sanitizeFileName(claim.claimNo)}-${sanitizeFileName(claim.applicantName)}-${Date.now()}.docx`,
    mimeType: WORD_MIME_TYPE,
    buffer: doc.getZip().generate({ type: "nodebuffer" }) as Buffer,
    templateType
  };
}

export function resolveTemplateType(balanceAmount: number): ReimbursementTemplateType {
  if (balanceAmount > 0) {
    return "1";
  }
  if (balanceAmount < 0) {
    return "2";
  }
  return "0";
}

function resolveTemplatePath(claimType: "travel" | "general", templateType: ReimbursementTemplateType): string {
  return path.resolve(__dirname, "templates", claimType, `template${templateType}.docx`);
}

function buildTravelData(claim: ReimbursementClaimDetail): TemplateData {
  const rows = claim.items.slice().sort((left, right) => left.sort - right.sort).slice(0, 3);
  const firstTravel = rows.find((item) => item.startDate || item.endDate) ?? rows[0];
  const fillDate = splitDate(claim.fillDate);
  const startDate = splitDate(firstTravel?.startDate ?? firstTravel?.occurredDate ?? "");
  const endDate = splitDate(firstTravel?.endDate ?? firstTravel?.occurredDate ?? "");
  const data: TemplateData = {
    dept: claim.departmentName,
    q1: fillDate.year,
    Q: fillDate.month,
    Z: fillDate.day,
    name: claim.applicantName,
    profession: claim.applicantTitleName ?? "",
    reason: claim.reason,
    A: startDate.year,
    B: startDate.month,
    C: startDate.day,
    D: "",
    E: endDate.year,
    F: endDate.month,
    G: endDate.day,
    H: "",
    I: sumTravelMetaNumber(rows, "days") || "",
    O: claim.attachments.length || "",
    d4: formatOptionalNumber(sumTravelMetaNumber(rows, "days")),
    a4: formatOptionalNumber(sumTravelMetaNumber(rows, "airfareAmount")),
    c4: formatOptionalNumber(sumTravelMetaNumber(rows, "carriageAmount")),
    u4: formatOptionalNumber(sumTravelMetaNumber(rows, "localTransportAmount")),
    s4: formatOptionalNumber(sumTravelMetaNumber(rows, "lodgingAmount")),
    e4: formatOptionalNumber(sumTravelMetaNumber(rows, "mealAllowanceAmount")),
    m4: formatOptionalNumber(sumTravelMetaNumber(rows, "mealAmount")),
    o4: formatOptionalNumber(sumTravelMetaNumber(rows, "otherAmount")),
    t4: formatMoney(claim.totalAmount),
    h: formatMoney(claim.advanceAmount),
    i: formatMoney(Math.abs(claim.balanceAmount)),
    ...amountDigitData(claim.totalAmount)
  };

  for (const [index, suffix] of TRAVEL_ROW_SUFFIXES.entries()) {
    const item = rows[index];
    const rowDate = splitDate(item?.occurredDate ?? item?.startDate ?? "");
    const rowTotal = item?.amount ?? 0;
    data[`x${suffix}`] = rowDate.month;
    data[`y${suffix}`] = rowDate.day;
    data[`p${suffix}`] = item ? buildLocation(item) : "";
    data[`d${suffix}`] = formatOptionalNumber(travelMetaNumber(item, "days"));
    data[`a${suffix}`] = formatOptionalNumber(travelMetaNumber(item, "airfareAmount"));
    data[`c${suffix}`] = formatOptionalNumber(travelMetaNumber(item, "carriageAmount"));
    data[`u${suffix}`] = formatOptionalNumber(travelMetaNumber(item, "localTransportAmount"));
    data[`s${suffix}`] = formatOptionalNumber(travelMetaNumber(item, "lodgingAmount"));
    data[`e${suffix}`] = formatOptionalNumber(travelMetaNumber(item, "mealAllowanceAmount"));
    data[`m${suffix}`] = formatOptionalNumber(travelMetaNumber(item, "mealAmount"));
    data[`o${suffix}`] = formatOptionalNumber(travelMetaNumber(item, "otherAmount"));
    data[`t${suffix}`] = rowTotal ? formatMoney(rowTotal) : "";
  }
  return data;
}

function buildGeneralData(claim: ReimbursementClaimDetail): TemplateData {
  const items = claim.items
    .filter((item) => Boolean(item.description?.trim()) || item.amount > 0)
    .slice()
    .sort((left, right) => left.sort - right.sort);
  const fillDate = splitDate(claim.fillDate);
  const data: TemplateData = {
    A: claim.departmentName,
    B: fillDate.year,
    C: fillDate.month,
    D: fillDate.day,
    E: claim.attachments.length || "",
    remark: claim.reason,
    X5: formatMoney(claim.totalAmount),
    h: formatMoney(claim.advanceAmount),
    i: formatMoney(Math.abs(claim.balanceAmount)),
    N: claim.applicantName,
    ...amountDigitData(claim.totalAmount)
  };
  for (let index = 0; index < 4; index += 1) {
    const item = items[index];
    data[`Z${index + 1}`] = item ? (item.description?.trim() || item.category || "") : "";
    data[`X${index + 1}`] = item && item.amount > 0 ? formatMoney(item.amount) : "";
  }
  return data;
}

function splitDate(value: string): { year: string; month: string; day: string } {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (!match) {
    return { year: "", month: "", day: "" };
  }
  return { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) };
}

function amountDigitData(amount: number): TemplateData {
  const cents = Math.abs(Math.round(amount * 100));
  const digits = String(cents).padStart(8, "0").slice(-8).split("");
  return {
    o: toUppercaseDigit(digits[0]),
    a: toUppercaseDigit(digits[1]),
    b: toUppercaseDigit(digits[2]),
    c: toUppercaseDigit(digits[3]),
    d: toUppercaseDigit(digits[4]),
    e: toUppercaseDigit(digits[5]),
    f: toUppercaseDigit(digits[6]),
    g: toUppercaseDigit(digits[7])
  };
}

function toUppercaseDigit(value: string): string {
  const map: Record<string, string> = {
    "0": "零",
    "1": "壹",
    "2": "贰",
    "3": "叁",
    "4": "肆",
    "5": "伍",
    "6": "陆",
    "7": "柒",
    "8": "捌",
    "9": "玖"
  };
  return map[value] ?? "零";
}

function buildLocation(item: ReimbursementItemEntity): string {
  if (item.fromLocation && item.toLocation) {
    return `${item.fromLocation}-${item.toLocation}`;
  }
  return item.fromLocation || item.toLocation || item.description || "";
}

function sumTravelMetaNumber(items: ReimbursementItemEntity[], key: keyof NonNullable<ReimbursementItemEntity["meta"]>): number {
  return items.reduce((sum, item) => sum + travelMetaNumber(item, key), 0);
}

function travelMetaNumber(item: ReimbursementItemEntity | undefined, key: keyof NonNullable<ReimbursementItemEntity["meta"]>): number {
  const value = item?.meta?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

function formatOptionalNumber(amount: number): string {
  return amount ? formatMoney(amount) : "";
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_");
}
