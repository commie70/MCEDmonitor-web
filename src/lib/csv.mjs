/** Spreadsheet-safe CSV, including formulas hidden behind whitespace. */
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s\uFEFF]*[=+@-]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCsv(rows) { return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"); }
