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
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) return [];

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const obj: Record<string, string> = {};
    let hasValue = false;
    row.eachCell((cell, colNumber) => {
      if (headers[colNumber]) {
        obj[headers[colNumber]] = String(cell.value ?? "").trim();
        if (obj[headers[colNumber]]) hasValue = true;
      }
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
