import * as ExcelJS from 'exceljs';
import {
  assertSafeXlsxBuffer,
  getUnitMemberImportTemplateCsv,
  isLegacyXls,
  isLikelyExcelBinary,
  parseUnitMemberImportCsv,
  parseUnitMemberImportFile,
  parseUnitMemberImportXlsx,
} from './service-units-member-import.util';

describe('service-units-member-import.util', () => {
  it('builds a CSV template with required headers', () => {
    const csv = getUnitMemberImportTemplateCsv();
    expect(csv).toContain('First Name,Last Name,Email,Phone');
    expect(csv).toContain('Jane,Doe');
  });

  it('parses valid rows and aliases', () => {
    const text = 'First Name,Surname,Email,Phone\nAda,Lovelace,ada@example.com,123\n';
    const { rows, failures } = parseUnitMemberImportCsv(text);
    expect(failures).toHaveLength(0);
    expect(rows).toEqual([
      {
        rowIndex: 2,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '123',
      },
    ]);
  });

  it('rejects missing name columns', () => {
    const { rows, failures } = parseUnitMemberImportCsv('Email,Phone\na@b.com,1\n');
    expect(rows).toHaveLength(0);
    expect(failures[0]?.reason).toMatch(/First Name and Last Name/i);
  });

  it('detects excel binary uploads', () => {
    expect(isLikelyExcelBinary(Buffer.from([0x50, 0x4b, 0x03, 0x04]), 'people.xlsx')).toBe(true);
    expect(isLikelyExcelBinary(Buffer.from('First Name,Last Name\nA,B\n'), 'people.csv')).toBe(
      false,
    );
    expect(isLegacyXls(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]), 'old.xls')).toBe(true);
  });

  it('rejects empty/oversize xlsx before parse', () => {
    expect(assertSafeXlsxBuffer(Buffer.alloc(0))).toMatch(/empty/i);
    expect(assertSafeXlsxBuffer(Buffer.alloc(2 * 1024 * 1024 + 10))).toMatch(/exceeds/i);
  });

  it('parses .xlsx workbooks', async () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Members');
    sheet.addRow(['First Name', 'Last Name', 'Email', 'Phone']);
    sheet.addRow(['Grace', 'Hopper', 'grace@example.com', '555']);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const { rows, failures } = await parseUnitMemberImportXlsx(buf);
    expect(failures).toHaveLength(0);
    expect(rows[0]).toMatchObject({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      phone: '555',
    });
  });

  it('routes csv vs xlsx in parseUnitMemberImportFile', async () => {
    const csv = await parseUnitMemberImportFile(
      Buffer.from('First Name,Last Name\nA,B\n'),
      'people.csv',
    );
    expect(csv.format).toBe('csv');
    expect(csv.rows[0]?.firstName).toBe('A');

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('M');
    sheet.addRow(['First Name', 'Last Name']);
    sheet.addRow(['X', 'Y']);
    const xbuf = Buffer.from(await wb.xlsx.writeBuffer());
    const xlsx = await parseUnitMemberImportFile(xbuf, 'people.xlsx');
    expect(xlsx.format).toBe('xlsx');
    expect(xlsx.rows[0]?.lastName).toBe('Y');
  });
});
