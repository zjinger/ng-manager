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
    fileName: `${sanitizeFileName(claim.claimNo)}-${claim.claimType === "travel" ? "差旅费报销单" : "费用报销单"}.docx`,
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
    profession: "",
    reason: claim.reason,
    A: startDate.year,
    B: startDate.month,
    C: startDate.day,
    D: metaString(firstTravel, "startTime"),
    E: endDate.year,
    F: endDate.month,
    G: endDate.day,
    H: metaString(firstTravel, "endTime"),
    I: sumMetaNumber(rows, "days") || "",
    O: claim.attachments.length || "",
    d4: formatOptionalNumber(sumMetaNumber(rows, "days")),
    a4: formatOptionalNumber(sumTravelAmount(rows, "air", "机票")),
    c4: formatOptionalNumber(sumTravelAmount(rows, "ship", "车船")),
    u4: formatOptionalNumber(sumTravelAmount(rows, "taxi", "交通")),
    s4: formatOptionalNumber(sumTravelAmount(rows, "hotel", "住宿")),
    e4: formatOptionalNumber(sumTravelAmount(rows, "travel", "出差")),
    m4: formatOptionalNumber(sumTravelAmount(rows, "meals", "餐费")),
    o4: formatOptionalNumber(sumTravelAmount(rows, "other", "其他")),
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
    data[`d${suffix}`] = metaString(item, "days");
    data[`a${suffix}`] = formatOptionalNumber(travelAmount(item, "air", "机票"));
    data[`c${suffix}`] = formatOptionalNumber(travelAmount(item, "ship", "车船"));
    data[`u${suffix}`] = formatOptionalNumber(travelAmount(item, "taxi", "交通"));
    data[`s${suffix}`] = formatOptionalNumber(travelAmount(item, "hotel", "住宿"));
    data[`e${suffix}`] = formatOptionalNumber(travelAmount(item, "travel", "出差"));
    data[`m${suffix}`] = formatOptionalNumber(travelAmount(item, "meals", "餐费"));
    data[`o${suffix}`] = formatOptionalNumber(travelAmount(item, "other", "其他"));
    data[`t${suffix}`] = rowTotal ? formatMoney(rowTotal) : "";
  }
  return data;
}

function buildGeneralData(claim: ReimbursementClaimDetail): TemplateData {
  const items = claim.items.slice().sort((left, right) => left.sort - right.sort);
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
    data[`Z${index + 1}`] = item ? (item.description || item.category || claim.reason) : "";
    data[`X${index + 1}`] = item ? formatMoney(item.amount) : "";
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
    o: digits[0],
    a: digits[1],
    b: digits[2],
    c: digits[3],
    d: digits[4],
    e: digits[5],
    f: digits[6],
    g: digits[7]
  };
}

function buildLocation(item: ReimbursementItemEntity): string {
  if (item.fromLocation && item.toLocation) {
    return `${item.fromLocation}-${item.toLocation}`;
  }
  return item.fromLocation || item.toLocation || item.description || "";
}

function sumTravelAmount(items: ReimbursementItemEntity[], metaKey: string, categoryKeyword: string): number {
  return items.reduce((sum, item) => sum + travelAmount(item, metaKey, categoryKeyword), 0);
}

function travelAmount(item: ReimbursementItemEntity | undefined, metaKey: string, categoryKeyword: string): number {
  if (!item) {
    return 0;
  }
  const metaAmount = metaNumber(item, metaKey);
  if (metaAmount !== 0) {
    return metaAmount;
  }
  if ((item.category ?? "").includes(categoryKeyword)) {
    return item.amount;
  }
  return 0;
}

function sumMetaNumber(items: ReimbursementItemEntity[], key: string): number {
  return items.reduce((sum, item) => sum + metaNumber(item, key), 0);
}

function metaNumber(item: ReimbursementItemEntity | undefined, key: string): number {
  const value = item?.meta?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metaString(item: ReimbursementItemEntity | undefined, key: string): string {
  const value = item?.meta?.[key];
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function formatMoney(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function formatOptionalNumber(amount: number): string {
  return amount ? formatMoney(amount) : "";
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_");
}
