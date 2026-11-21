import * as ExcelJS from 'exceljs';
import { parseCsvText } from '../membership/membership-import-csv.util';

export const UNIT_MEMBER_IMPORT_HEADERS = [
  'First Name',
  'Last Name',
  'Email',
  'Phone',
] as const;

export const UNIT_MEMBER_IMPORT_MAX_ROWS = 500;

export type UnitMemberImportRow = {
  rowIndex: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

export type UnitMemberImportParseFailure = {
  rowIndex: number;
  reason: string;
};

const HEADER_ALIASES: Record<string, keyof Omit<UnitMemberImportRow, 'rowIndex'>> = {
  'first name': 'firstName',
  firstname: 'firstName',
  first_name: 'firstName',
  'last name': 'lastName',
  lastname: 'lastName',
  last_name: 'lastName',
  surname: 'lastName',
  email: 'email',
  'email address': 'email',
  phone: 'phone',
  'phone number': 'phone',
  mobile: 'phone',
  cellphone: 'phone',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getUnitMemberImportTemplateCsv(): string {
  const header = UNIT_MEMBER_IMPORT_HEADERS.join(',');
  const example = 'Jane,Doe,jane.doe@example.com,+447700900123';
  // BOM helps Excel open UTF-8 CSV correctly
  return `\uFEFF${header}\n${example}\n`;
}

function mapRowsFromTable(
  headers: string[],
  rawRows: Array<Record<string, string>>,
): {
  rows: UnitMemberImportRow[];
  failures: UnitMemberImportParseFailure[];
} {
  if (!headers.length) {
    return { rows: [], failures: [{ rowIndex: 0, reason: 'File has no header row' }] };
  }

  const columnMap = new Map<string, string>();
  for (const h of headers) {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    if (key) columnMap.set(key, h);
  }

  if (!columnMap.has('firstName') || !columnMap.has('lastName')) {
    return {
      rows: [],
      failures: [
        {
          rowIndex: 0,
          reason: 'File must include First Name and Last Name columns (see sample template)',
        },
      ],
    };
  }

  const rows: UnitMemberImportRow[] = [];
  const failures: UnitMemberImportParseFailure[] = [];

  rawRows.slice(0, UNIT_MEMBER_IMPORT_MAX_ROWS).forEach((raw, i) => {
    const rowIndex = i + 2; // 1-based data row accounting for header
    const firstName = (raw[columnMap.get('firstName')!] ?? '').trim();
    const lastName = (raw[columnMap.get('lastName')!] ?? '').trim();
    const email = columnMap.has('email')
      ? (raw[columnMap.get('email')!] ?? '').trim()
      : '';
    const phone = columnMap.has('phone')
      ? (raw[columnMap.get('phone')!] ?? '').trim()
      : '';

    if (!firstName || !lastName) {
      failures.push({
        rowIndex,
        reason: 'First Name and Last Name are required',
      });
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      failures.push({ rowIndex, reason: `Invalid email: ${email}` });
      return;
    }

    rows.push({
      rowIndex,
      firstName: firstName.slice(0, 80),
      lastName: lastName.slice(0, 80),
      email: email ? email.slice(0, 200) : undefined,
      phone: phone ? phone.slice(0, 40) : undefined,
    });
  });

  if (rawRows.length > UNIT_MEMBER_IMPORT_MAX_ROWS) {
    failures.push({
      rowIndex: UNIT_MEMBER_IMPORT_MAX_ROWS + 2,
      reason: `Only the first ${UNIT_MEMBER_IMPORT_MAX_ROWS} data rows are imported`,
    });
  }

  return { rows, failures };
}

export function parseUnitMemberImportCsv(text: string): {
  rows: UnitMemberImportRow[];
  failures: UnitMemberImportParseFailure[];
} {
  const { headers, rows: rawRows } = parseCsvText(text);
  return mapRowsFromTable(headers, rawRows);
}

/** Detect common Excel binary uploads (.xlsx / legacy .xls). */
export function isLikelyExcelBinary(buffer: Buffer, filename?: string): boolean {
  const name = (filename ?? '').toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return true;
  // ZIP header used by .xlsx
  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) return true;
  // OLE compound document header used by legacy .xls
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return true;
  }
  return false;
}

export function isLegacyXls(buffer: Buffer, filename?: string): boolean {
  const name = (filename ?? '').toLowerCase();
  if (name.endsWith('.xls') && !name.endsWith('.xlsx')) return true;
  return (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  );
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result != null) return String(value.result);
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join('');
    }
  }
  return String(value);
}

const XLSX_MAX_BYTES = 2 * 1024 * 1024;
const XLSX_MAX_COLUMNS = 20;
const XLSX_MAX_SCAN_ROWS = UNIT_MEMBER_IMPORT_MAX_ROWS + 2;

/** Reject oversized or suspiciously packed zip containers before ExcelJS expands them. */
export function assertSafeXlsxBuffer(buffer: Buffer): string | null {
  if (!buffer?.length) return 'Excel file is empty';
  if (buffer.length > XLSX_MAX_BYTES) {
    return `Excel file exceeds ${XLSX_MAX_BYTES / (1024 * 1024)}MB limit`;
  }
  // Deflate streams inside OOXML: reject files that claim extreme uncompressed sizes.
  // Local file header signature 0x04034b50; compressed/uncompressed sizes at +18/+22.
  let offset = 0;
  let entries = 0;
  while (offset + 30 <= buffer.length && entries < 64) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const comp = buffer.readUInt32LE(offset + 18);
    const uncomp = buffer.readUInt32LE(offset + 22);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    // Skip zip64 / unknown sizes (0xffffffff) rather than trusting them.
    if (uncomp !== 0xffffffff && comp !== 0xffffffff) {
      if (uncomp > 8 * 1024 * 1024) {
        return 'Excel file expands to more than 8MB and was rejected';
      }
      if (comp > 0 && uncomp / comp > 100) {
        return 'Excel file compression ratio is too high and was rejected';
      }
    }
    offset += 30 + nameLen + extraLen + (comp === 0xffffffff ? 0 : comp);
    entries += 1;
  }
  return null;
}

/** Parse first worksheet of an .xlsx workbook into the same row shape as CSV import. */
export async function parseUnitMemberImportXlsx(buffer: Buffer): Promise<{
  rows: UnitMemberImportRow[];
  failures: UnitMemberImportParseFailure[];
}> {
  const unsafe = assertSafeXlsxBuffer(buffer);
  if (unsafe) {
    return { rows: [], failures: [{ rowIndex: 0, reason: unsafe }] };
  }

  const workbook = new ExcelJS.Workbook();
  // exceljs typings accept Buffer via ArrayBuffer-like; Node Buffer is fine at runtime
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], failures: [{ rowIndex: 0, reason: 'Workbook has no worksheets' }] };
  }

  const dim = sheet.dimensions;
  if (dim && (dim.bottom > XLSX_MAX_SCAN_ROWS + 50 || dim.right > XLSX_MAX_COLUMNS + 5)) {
    return {
      rows: [],
      failures: [
        {
          rowIndex: 0,
          reason: `Spreadsheet is too large (max ${UNIT_MEMBER_IMPORT_MAX_ROWS} data rows, ${XLSX_MAX_COLUMNS} columns)`,
        },
      ],
    };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (colNumber > XLSX_MAX_COLUMNS) return;
    headers[colNumber - 1] = cellToString(cell.value).trim();
  });
  // Compact sparse header array
  const compactHeaders = headers.map((h) => h ?? '');

  const rawRows: Array<Record<string, string>> = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    if (rowNumber > XLSX_MAX_SCAN_ROWS) return;
    const obj: Record<string, string> = {};
    compactHeaders.forEach((h, idx) => {
      if (!h || idx >= XLSX_MAX_COLUMNS) return;
      obj[h] = cellToString(row.getCell(idx + 1).value).trim();
    });
    rawRows.push(obj);
  });

  return mapRowsFromTable(
    compactHeaders.filter(Boolean),
    rawRows,
  );
}

/** Parse CSV or .xlsx into unit-member import rows. Rejects legacy .xls. */
export async function parseUnitMemberImportFile(
  buffer: Buffer,
  filename?: string,
): Promise<{
  rows: UnitMemberImportRow[];
  failures: UnitMemberImportParseFailure[];
  format: 'csv' | 'xlsx';
}> {
  if (isLegacyXls(buffer, filename)) {
    return {
      rows: [],
      failures: [
        {
          rowIndex: 0,
          reason:
            'Legacy .xls is not supported. Save as .xlsx or CSV (Download sample → edit → Save As).',
        },
      ],
      format: 'csv',
    };
  }

  if (isLikelyExcelBinary(buffer, filename)) {
    const parsed = await parseUnitMemberImportXlsx(buffer);
    return { ...parsed, format: 'xlsx' };
  }

  const text = buffer.toString('utf8');
  return { ...parseUnitMemberImportCsv(text), format: 'csv' };
}
