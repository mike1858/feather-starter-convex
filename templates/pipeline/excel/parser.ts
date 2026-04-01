// ── Excel Parser ─────────────────────────────────────────────────────────────
// Parses .xlsx/.xls files into structured sheet data.
// Full implementation in Plan 999.5-01.

import * as XLSX from "xlsx";
import type { ParsedWorkbook } from "./types";

/**
 * Parse an Excel workbook from an ArrayBuffer.
 * Returns structured sheet data with headers and rows.
 */
export function parseExcelWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheets = workbook.SheetNames.map((name: string) => {
    const sheet = workbook.Sheets[name];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    return {
      name,
      headers,
      rows: jsonData,
      rowCount: jsonData.length,
    };
  });

  return { fileName, sheets };
}
