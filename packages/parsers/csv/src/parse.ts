import { parse } from "csv-parse/sync";

export type CsvRecords = string[][];

export function parseCsvRecords(input: string): CsvRecords {
  return parse(input, {
    bom: true,
    columns: false,
    skip_empty_lines: true,
    relax_column_count: false,
    trim: false,
  }) as CsvRecords;
}
