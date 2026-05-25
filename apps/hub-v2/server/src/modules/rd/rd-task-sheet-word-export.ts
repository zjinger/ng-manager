import type { RdTaskSheetDetail, RenderedRdTaskSheetWord } from "./rd-task-sheet.types";

const JSZip = require("jszip");

const WORD_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;

export function renderRdTaskSheetWord(sheet: RdTaskSheetDetail): RenderedRdTaskSheetWord {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypesXml());
  zip.folder("_rels").file(".rels", rootRelsXml());
  zip.folder("word").file("document.xml", documentXml(sheet));
  zip.folder("word").folder("_rels").file("document.xml.rels", documentRelsXml());
  return {
    fileName: `${sanitizeFileName(sheet.sheetNo)}-${sanitizeFileName(sheet.title)}.docx`,
    mimeType: WORD_MIME_TYPE,
    buffer: zip.generate({ type: "nodebuffer" }) as Buffer
  };
}

function documentXml(sheet: RdTaskSheetDetail): string {
  const rows = [
    row(cell("日期", 1800), cell(formatWordDate(sheet.issueDate), 4200), cell("编号", 1800), cell(sheet.sheetNo, 4200)),
    row(cell("发起部门", 1800), cell(sheet.issuerDepartment, 4200), cell("接收部门", 1800), cell(sheet.receiverDepartment, 4200)),
    row(cell("发起人", 1800), cell(sheet.issuerName, 4200), cell("接收人", 1800), cell(compact([sheet.receiverName, sheet.receiverPhone]), 4200)),
    row(cell("客户单位", 1800), cell(sheet.customerCompany, 4200), cell("客户联系人", 1800), cell(sheet.customerContact, 4200)),
    row(cell("项目名称", 1800), cell(sheet.projectName || sheet.title, 4200), cell("客户联系方式", 1800), cell(sheet.customerPhone, 4200)),
    row(cell("项目联系人", 1800), cell(sheet.projectContact, 4200), cell("相关系统", 1800), cell(sheet.relatedSystem, 4200)),
    row(
      cell("紧急程度", 1800),
      cell(`${checkbox(sheet.urgency === "normal")}一般 ${checkbox(sheet.urgency === "urgent")}紧急`, 4200),
      cell("期望解决时间", 1800),
      cell(formatWordDate(sheet.expectedResolvedAt), 4200)
    ),
    row(
      cell("处理结果", 1800),
      cell(`${checkbox(sheet.result === "resolved")}已解决 ${checkbox(sheet.result === "unresolved")}未解决`, 4200),
      cell("解决时间", 1800),
      cell(formatWordDate(sheet.resolvedAt), 4200)
    ),
    row(
      cell("业务类型", 1800),
      cell(
        `${checkbox(sheet.businessType === "development")}研发   ${checkbox(sheet.businessType === "after_sales")}售后   ${checkbox(sheet.businessType === "consulting")}询价   ${checkbox(sheet.businessType === "technical_service")}技术服务   ${checkbox(sheet.businessType === "other")}其他`,
        10200,
        3
      )
    ),
    row(cell("业务描述\n（填写不下可在表后附件）", 1800), cell(sheet.businessDescription, 10200, 3, 5600)),
    row(cell("交付内容\n\n答复", 1800), cell(sheet.deliveryContent, 10200, 3, 2600))
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>天津天元海科技开发有限公司业务联络单</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="12000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6"/><w:left w:val="single" w:sz="6"/><w:bottom w:val="single" w:sz="6"/><w:right w:val="single" w:sz="6"/>
          <w:insideH w:val="single" w:sz="6"/><w:insideV w:val="single" w:sz="6"/>
        </w:tblBorders>
      </w:tblPr>
      ${rows}
    </w:tbl>
    <w:p><w:r><w:t>制单：${escapeXml(sheet.creatorName)}</w:t></w:r><w:r><w:tab/><w:tab/><w:tab/><w:tab/><w:t>审核：</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080"/></w:sectPr>
  </w:body>
</w:document>`;
}

function row(...cells: string[]): string {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function cell(value: string | null | undefined, width: number, gridSpan = 1, height?: number): string {
  const span = gridSpan > 1 ? `<w:gridSpan w:val="${gridSpan}"/>` : "";
  void height;
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span}</w:tcPr>${textRuns(value)}</w:tc>`;
}

function textRuns(value: string | null | undefined): string {
  const lines = (value ?? "").split(/\r?\n/);
  return `<w:p>${lines
    .map((line, index) => `<w:r>${index > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`)
    .join("")}</w:p>`;
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function documentRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;
}

function formatWordDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value ?? "");
  if (!match) {
    return "";
  }
  return `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日`;
}

function checkbox(checked: boolean): string {
  return checked ? "☑" : "□";
}

function compact(values: Array<string | null | undefined>): string {
  return values.map((value) => value?.trim()).filter(Boolean).join("，");
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
