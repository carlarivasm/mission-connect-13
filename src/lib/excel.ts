import ExcelJS from "exceljs";

/**
 * Export an array of objects as an Excel (.xlsx) file download.
 */
export async function exportToExcel(
  data: Record<string, string | number>[],
  sheetName: string,
  fileName: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) return;

  // Add header row
  const columns = Object.keys(data[0]);
  worksheet.columns = columns.map((key) => ({ header: key, key, width: 20 }));

  // Add data rows
  data.forEach((row) => worksheet.addRow(row));

  // Style header
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

/**
 * Export an array of objects as a CSV file download.
 */
export function exportToCsv(
  data: Record<string, string | number>[],
  fileName: string
) {
  if (data.length === 0) return;
  const columns = Object.keys(data[0]);
  const header = columns.join(",");
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = String(row[col] ?? "");
      return val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, fileName);
}

/**
 * Read an Excel or CSV file and return rows as array of objects.
 */
export async function readExcelFile(file: File): Promise<Record<string, string>[]> {
  const fileName = file.name.toLowerCase();

  // Handle CSV / TSV files
  if (fileName.endsWith(".csv") || fileName.endsWith(".tsv") || fileName.endsWith(".txt")) {
    const text = await file.text();
    return parseCsvText(text);
  }

  // Try xlsx parsing
  const buffer = await file.arrayBuffer();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) return [];

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber] = getCellString(cell);
    });

    const rows: Record<string, string>[] = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const obj: Record<string, string> = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (headers[colNumber]) {
          obj[headers[colNumber]] = getCellString(cell);
          if (obj[headers[colNumber]]) hasValue = true;
        }
      });
      if (hasValue) rows.push(obj);
    }

    if (rows.length > 0) return rows;
  } catch {
    // xlsx failed, fall through
  }

  // Fallback: try reading as CSV text (handles .xls Google Sheets exports, etc.)
  try {
    const text = await file.text();
    const csvRows = parseCsvText(text);
    if (csvRows.length > 0) return csvRows;
  } catch {
    // ignore
  }

  return [];
}

/** Extract string from an ExcelJS cell, handling RichText and hyperlinks */
function getCellString(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val == null) return "";
  // RichText object: { richText: [{ text: "..." }, ...] }
  if (typeof val === "object" && "richText" in (val as any)) {
    return ((val as any).richText as { text: string }[])
      .map((r) => r.text)
      .join("")
      .trim();
  }
  // Hyperlink object: { text: "...", hyperlink: "..." }
  if (typeof val === "object" && "text" in (val as any)) {
    return String((val as any).text).trim();
  }
  // Formula result
  if (typeof val === "object" && "result" in (val as any)) {
    return String((val as any).result ?? "").trim();
  }
  return String(val).trim();
}

/** Parse CSV text into rows */
function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if ((ch === "," || ch === ";") && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const obj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      if (h && cols[idx]) { obj[h] = cols[idx]; hasValue = true; }
    });
    if (hasValue) rows.push(obj);
  }
  return rows;
}

function downloadBuffer(buffer: ArrayBuffer | ExcelJS.Buffer, fileName: string, mimeType: string) {
  const blob = new Blob([buffer], { type: mimeType });
  downloadBlob(blob, fileName);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
