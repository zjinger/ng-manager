import fs from "node:fs";
import path from "node:path";
import Docxtemplater from "docxtemplater";

import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RdTaskSheetDetail, RenderedRdTaskSheetWord } from "./rd-task-sheet.types";

const JSZip = require("jszip");

const WORD_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;
const TEMPLATE_FILE = "task_sheeet_template.docx";
const CHECKED = "☑";
const UNCHECKED = "☐";

type TemplateData = Record<string, string>;

export function renderRdTaskSheetWord(sheet: RdTaskSheetDetail): RenderedRdTaskSheetWord {
  const templatePath = path.resolve(__dirname, "templates", TEMPLATE_FILE);
  if (!fs.existsSync(templatePath)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `rd task sheet word template not found: ${templatePath}`, 404);
  }

  const content = fs.readFileSync(templatePath, "binary");
  const zip = new JSZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(buildTaskSheetData(sheet));

  return {
    fileName: `${sanitizeFileName(sheet.sheetNo)}-${sanitizeFileName(sheet.title)}-${Date.now()}.docx`,
    mimeType: WORD_MIME_TYPE,
    buffer: doc.getZip().generate({ type: "nodebuffer" }) as Buffer
  };
}

function buildTaskSheetData(sheet: RdTaskSheetDetail): TemplateData {
  const receiver = [sheet.receiverName, sheet.receiverPhone].filter(Boolean).join("，");
  return {
    issueDate: formatDate(sheet.issueDate),
    sheetNo: sheet.sheetNo,
    issuerDepartment: sheet.issuerDepartment ?? "",
    receiverDepartment: sheet.receiverDepartment ?? "",
    issuerName: sheet.issuerName,
    receiverName: receiver,
    customerCompany: sheet.customerCompany ?? "",
    customerContact: sheet.customerContact ?? "",
    projectName: sheet.projectName ?? sheet.title,
    customerPhone: sheet.customerPhone ?? "",
    projectContact: sheet.projectContact ?? "",
    relatedSystem: sheet.relatedSystem ?? "",
    urgencyNormal: checkbox(sheet.urgency === "normal"),
    urgencyUrgent: checkbox(sheet.urgency === "urgent"),
    expectedResolvedAt: sheet.expectedResolvedAt ? formatDate(sheet.expectedResolvedAt) : "",
    resultResolved: checkbox(sheet.result === "resolved"),
    resultUnresolved: checkbox(sheet.result === "unresolved"),
    resolvedAt: sheet.resolvedAt ? formatDate(sheet.resolvedAt) : "",
    businessTypeDevelopment: checkbox(sheet.businessType === "development"),
    businessTypeAfterSales: checkbox(sheet.businessType === "after_sales"),
    businessTypeConsulting: checkbox(sheet.businessType === "consulting"),
    businessTypeTechnicalService: checkbox(sheet.businessType === "technical_service"),
    businessTypeOther: checkbox(sheet.businessType === "other"),
    businessDescription: sheet.businessDescription,
    deliveryContent: sheet.deliveryContent ?? "",
    preparedByName: sheet.preparedByName ?? sheet.creatorName,
    reviewerName: sheet.reviewerName ?? ""
  };
}

function checkbox(checked: boolean): string {
  return checked ? CHECKED : UNCHECKED;
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (!match) {
    return value;
  }
  return `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日`;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}
