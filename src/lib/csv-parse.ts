import Papa from 'papaparse';
import {
  CSV_COLUMNS,
  groupRowsIntoProducts,
  type CsvRow,
  type GroupingResult,
} from '@/components/batch/csvTemplate';

export interface CsvParseResult extends GroupingResult {
  rowCount: number;
}

export function parseCsvText(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const rows: CsvRow[] = (parsed.data ?? []).map((raw) => {
    const row = {} as CsvRow;
    for (const col of CSV_COLUMNS) {
      row[col] = (raw[col] ?? '').toString();
    }
    return row;
  });
  const grouped = groupRowsIntoProducts(rows);
  return { ...grouped, rowCount: rows.length };
}

export function parseCsvFile(file: File): Promise<CsvParseResult> {
  return file.text().then(parseCsvText);
}
