import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

import type { CreateProjectFeaturePointInput, ProjectFeaturePointStatus } from '../models/project.model';

export interface ProjectFeatureProgressImportRow {
  rowNumber: number;
  groupTitle: string | null;
  moduleName: string | null;
  submoduleName: string | null;
  name: string;
  progress: number;
  status: ProjectFeaturePointStatus;
  remark: string | null;
}

export interface ProjectFeatureProgressImportResult {
  sheetName: string;
  rows: ProjectFeatureProgressImportRow[];
  warnings: string[];
}

type HeaderKey = 'module' | 'submodule' | 'name' | 'progress' | 'remark';
type HeaderMap = Partial<Record<HeaderKey, number>> & { headerRow: number };

@Injectable({ providedIn: 'root' })
export class ProjectFeatureProgressExcelImportService {
  async parse(file: File): Promise<ProjectFeatureProgressImportResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheetName = workbook.SheetNames[0] ?? '';
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error('未找到可解析的工作表');
    }

    const matrix = this.readMatrixWithMergedCells(sheet);
    const header = this.findHeader(matrix);
    if (!header || header.name === undefined) {
      throw new Error('未识别到功能点表头，请确认包含“功能点计数项名称”或“功能点”列');
    }

    const warnings: string[] = [];
    const rows: ProjectFeatureProgressImportRow[] = [];
    let currentGroupTitle: string | null = null;

    for (let rowIndex = header.headerRow + 1; rowIndex < matrix.length; rowIndex += 1) {
      const row = matrix[rowIndex] ?? [];
      const name = this.normalizeText(row[header.name]);
      const moduleName = this.normalizeText(header.module === undefined ? '' : row[header.module]);
      const submoduleName = this.normalizeText(header.submodule === undefined ? '' : row[header.submodule]);
      const remark = this.normalizeText(header.remark === undefined ? '' : row[header.remark]);
      const maybeGroupTitle = this.findGroupTitle(row, header);

      if (maybeGroupTitle && this.isGroupTitleRow(row, header, maybeGroupTitle)) {
        currentGroupTitle = maybeGroupTitle;
        continue;
      }

      if (!name) {
        if (maybeGroupTitle) {
          currentGroupTitle = maybeGroupTitle;
        }
        continue;
      }

      rows.push({
        rowNumber: rowIndex + 1,
        groupTitle: currentGroupTitle,
        moduleName,
        submoduleName,
        name,
        progress: 0,
        status: 'todo',
        remark,
      });
    }

    if (rows.length === 0) {
      throw new Error('未解析到功能点数据');
    }

    return { sheetName, rows, warnings };
  }

  toCreateInput(row: ProjectFeatureProgressImportRow, sort: number): CreateProjectFeaturePointInput {
    return {
      groupTitle: row.groupTitle,
      moduleName: row.moduleName,
      submoduleName: row.submoduleName,
      name: row.name,
      progress: row.progress,
      status: row.status,
      sort,
      remark: row.remark,
    };
  }

  private readMatrixWithMergedCells(sheet: XLSX.WorkSheet): string[][] {
    const range = XLSX.utils.decode_range(String(sheet['!ref'] ?? 'A1:A1'));
    const matrix: string[][] = [];

    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const values: string[] = [];
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        values[col] = this.cellText(sheet, row, col);
      }
      matrix[row] = values;
    }

    for (const merge of sheet['!merges'] ?? []) {
      const source = this.cellText(sheet, merge.s.r, merge.s.c);
      if (!source) {
        continue;
      }
      for (let row = merge.s.r; row <= merge.e.r; row += 1) {
        matrix[row] = matrix[row] ?? [];
        for (let col = merge.s.c; col <= merge.e.c; col += 1) {
          matrix[row][col] = matrix[row][col] || source;
        }
      }
    }

    return matrix;
  }

  private cellText(sheet: XLSX.WorkSheet, row: number, col: number): string {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    const value: unknown = cell?.w ?? cell?.v ?? '';
    return this.normalizeText(value);
  }

  private findHeader(matrix: string[][]): HeaderMap | null {
    for (let rowIndex = 0; rowIndex < Math.min(matrix.length, 20); rowIndex += 1) {
      const row = matrix[rowIndex] ?? [];
      const header: HeaderMap = { headerRow: rowIndex };
      row.forEach((cell, colIndex) => {
        const normalized = this.normalizeHeader(cell);
        if (normalized === '模块') header.module = colIndex;
        if (normalized === '子模块') header.submodule = colIndex;
        if (normalized.includes('功能点') || normalized.includes('功能名称')) header.name = colIndex;
        if (normalized.includes('完成情况') || normalized.includes('进度')) header.progress = colIndex;
        if (normalized.includes('备注')) header.remark = colIndex;
      });
      if (header.name !== undefined && (header.module !== undefined || header.submodule !== undefined)) {
        return header;
      }
    }
    return null;
  }

  private findGroupTitle(row: string[], header: HeaderMap): string | null {
    const ignoredColumns = new Set(
      [header.progress, header.remark].filter(
        (value): value is number => value !== undefined
      )
    );
    const candidates = row
      .map((value, index) => ({ value: this.normalizeText(value), index }))
      .filter((item) => item.value && !ignoredColumns.has(item.index));
    if (candidates.length === 0) {
      return null;
    }
    return candidates[0]?.value ?? null;
  }

  private isGroupTitleRow(row: string[], header: HeaderMap, groupTitle: string): boolean {
    const progress = this.normalizeText(header.progress === undefined ? '' : row[header.progress]);
    const name = this.normalizeText(header.name === undefined ? '' : row[header.name]);
    const moduleName = this.normalizeText(header.module === undefined ? '' : row[header.module]);
    const submoduleName = this.normalizeText(header.submodule === undefined ? '' : row[header.submodule]);
    const repeatedTitleCount = [name, moduleName, submoduleName].filter((value) => value === groupTitle).length;
    return !progress && (repeatedTitleCount >= 2 || this.looksLikeNumberedGroupTitle(groupTitle));
  }

  private looksLikeNumberedGroupTitle(value: string): boolean {
    return /^[一二三四五六七八九十百千万\d]+[、.．]\s*\S+/.test(value);
  }

  private normalizeHeader(value: unknown): string {
    return this.normalizeText(value).replace(/\s+/g, '');
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '').replace(/\u3000/g, ' ').trim();
  }
}
