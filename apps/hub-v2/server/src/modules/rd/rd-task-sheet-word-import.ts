import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { CreateRdTaskSheetInput, RdTaskSheetBusinessType, RdTaskSheetResult, RdTaskSheetUrgency } from "./rd-task-sheet.types";

const JSZip = require("jszip");

export function parseRdTaskSheetWord(buffer: Buffer): CreateRdTaskSheetInput {
  let documentXml = "";
  try {
    const zip = new JSZip(buffer);
    documentXml = zip.file("word/document.xml")?.asText() ?? "";
  } catch {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "无法读取 Word 文档，请确认文件为 .docx 格式", 400);
  }

  if (!documentXml.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Word 文档内容为空或格式不受支持", 400);
  }

  const rows = extractTableRows(documentXml);
  const fields = mapFields(rows);
  const title = fields["项目名称"] || fields["标题"] || "";
  const businessDescription = fields["业务描述"] || fields["需求"] || "";
  if (!title.trim() && !businessDescription.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "未识别到任务单的项目名称或业务描述", 400);
  }

  const receiver = splitNameAndPhone(fields["接收人"]);
  return {
    sheetNo: fields["编号"] || null,
    title: title || firstLine(businessDescription) || "历史任务单",
    issueDate: parseDate(fields["日期"]) || undefined,
    issuerDepartment: fields["发起部门"] || null,
    issuerName: fields["发起人"] || null,
    receiverDepartment: fields["接收部门"] || null,
    receiverName: receiver.name || fields["接收人"] || null,
    receiverPhone: receiver.phone || null,
    customerCompany: fields["客户单位"] || null,
    customerContact: fields["客户联系人"] || null,
    customerPhone: fields["客户联系方式"] || null,
    projectName: title || null,
    projectContact: fields["项目联系人"] || null,
    relatedSystem: fields["相关系统"] || null,
    urgency: parseUrgency(fields["紧急程度"]),
    businessType: parseBusinessType(fields["业务类型"]),
    expectedResolvedAt: parseDate(fields["期望解决时间"]) || null,
    resolvedAt: parseDate(fields["解决时间"]) || null,
    result: parseResult(fields["处理结果"]),
    businessDescription: businessDescription || title || "历史任务单",
    deliveryContent: fields["交付内容"] || fields["答复"] || null
  };
}

function extractTableRows(xml: string): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[0].matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)) {
      cells.push(extractCellText(cellMatch[0]));
    }
    if (cells.some((cell) => cell.trim())) {
      rows.push(cells);
    }
  }
  return rows;
}

function extractCellText(xml: string): string {
  const pieces: string[] = [];
  for (const textMatch of xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
    pieces.push(decodeXml(textMatch[1]));
  }
  for (const checkMatch of xml.matchAll(/<w:checked[^>]*w:val="([^"]+)"/g)) {
    pieces.push(checkMatch[1] === "1" || checkMatch[1] === "true" ? "☑" : "□");
  }
  return pieces.join("").replace(/\s+/g, " ").trim();
}

function mapFields(rows: string[][]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const row of rows) {
    if (row.length >= 4) {
      addField(fields, row[0], row[1]);
      addField(fields, row[2], row[3]);
      continue;
    }
    if (row.length >= 2) {
      addField(fields, row[0], row.slice(1).join("\n"));
    }
  }
  return fields;
}

function addField(fields: Record<string, string>, rawLabel: string | undefined, value: string | undefined): void {
  const label = normalizeLabel(rawLabel);
  if (!label) {
    return;
  }
  const normalizedValue = (value ?? "").trim();
  if (!normalizedValue) {
    return;
  }
  fields[label] = normalizedValue;
}

function normalizeLabel(value: string | undefined): string {
  const normalized = (value ?? "").replace(/[：:\s()（）]/g, "");
  if (!normalized) {
    return "";
  }
  if (normalized.includes("业务描述")) {
    return "业务描述";
  }
  if (normalized.includes("交付内容") || normalized.includes("答复")) {
    return normalized.includes("答复") ? "答复" : "交付内容";
  }
  const labels = [
    "日期",
    "编号",
    "发起部门",
    "接收部门",
    "发起人",
    "接收人",
    "客户单位",
    "客户联系人",
    "客户联系方式",
    "项目名称",
    "项目联系人",
    "相关系统",
    "紧急程度",
    "期望解决时间",
    "处理结果",
    "解决时间",
    "业务类型"
  ];
  return labels.find((label) => normalized.includes(label)) ?? "";
}

function parseDate(value: string | undefined): string | null {
  const text = value?.trim();
  if (!text) {
    return null;
  }
  const match = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(text);
  if (!match) {
    return null;
  }
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function parseUrgency(value: string | undefined): RdTaskSheetUrgency {
  return isChecked(value ?? "", "紧急") ? "urgent" : "normal";
}

function parseBusinessType(value: string | undefined): RdTaskSheetBusinessType {
  const text = value ?? "";
  if (isChecked(text, "研发")) {
    return "development";
  }
  if (isChecked(text, "售后")) {
    return "after_sales";
  }
  if (isChecked(text, "询价") || isChecked(text, "咨询")) {
    return "consulting";
  }
  if (isChecked(text, "技术服务")) {
    return "technical_service";
  }
  return "other";
}

function parseResult(value: string | undefined): RdTaskSheetResult | null {
  const text = value ?? "";
  if (isChecked(text, "已解决")) {
    return "resolved";
  }
  if (isChecked(text, "未解决")) {
    return "unresolved";
  }
  return null;
}

function isChecked(text: string, label: string): boolean {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(☑|√|✔)\\s*${escaped}|${escaped}\\s*(☑|√|✔)`).test(text) || text.trim() === label;
}

function splitNameAndPhone(value: string | undefined): { name: string | null; phone: string | null } {
  const text = value?.trim() ?? "";
  const phone = /1\d{10}|0\d{2,3}[-\s]?\d{7,8}/.exec(text)?.[0] ?? null;
  const name = phone ? text.replace(phone, "").replace(/[，,、\s]+$/g, "").trim() : text;
  return { name: name || null, phone };
}

function firstLine(value: string): string {
  return value.split(/\r?\n/).map((item) => item.trim()).find(Boolean) ?? "";
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}
