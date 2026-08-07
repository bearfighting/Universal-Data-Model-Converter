import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { errorMessage } from "./errors.js";
import { parseCsvRecords } from "./parse.js";
import { failure, lowerCsvRecords, lowerCsvValueRecords } from "./profile.js";
import type { CsvRecords } from "./parse.js";
import type { CsvParseOptions } from "./options.js";

export interface CsvParseSuccessResult {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}

export type CsvParseFailureResult = ParseFailureResult<string>;
export type CsvParseResult = CsvParseSuccessResult | CsvParseFailureResult;

export interface CsvValueParseSuccessResult {
  ok: true;
  document: ValueDocument;
  diagnostics?: SchemaDiagnostic[];
}

export type CsvValueParseResult =
  CsvValueParseSuccessResult | CsvParseFailureResult;

export function tryParseCsvDocument(
  input: string,
  options: CsvParseOptions = {},
): CsvParseResult {
  const result = parseAndLower(input, options.name ?? "CsvDocument");
  if (!result.ok) return result;
  return result;
}

export function tryParseCsvValueDocument(
  input: string,
  options: CsvParseOptions = {},
): CsvValueParseResult {
  const records = parseRecords(input);
  if (!Array.isArray(records)) return records;
  const result = lowerCsvValueRecords(options.name ?? "CsvDocument", records);
  if (!result.ok) return result;
  return { ok: true, document: result.document };
}

export const tryInferCsvDocument = tryParseCsvDocument;

function parseAndLower(input: string, name: string): CsvParseResult {
  const records = parseRecords(input);
  if (!Array.isArray(records)) return records;
  return lowerCsvRecords(name, records);
}

function parseRecords(input: string): CsvRecords | ParseFailureResult<string> {
  let records;
  try {
    records = parseCsvRecords(input);
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "CSV_RECORD_INCONSISTENT_FIELDS_LENGTH"
        ? "csv-row-width-mismatch"
        : "invalid-csv";
    return failure(
      code,
      `The CSV input could not be parsed: ${errorMessage(error)}`,
      parseErrorEvidence(error),
    );
  }

  return records;
}

function parseErrorEvidence(error: unknown): unknown {
  if (!error || typeof error !== "object") return undefined;

  const source = error as Record<string, unknown>;
  const evidence: Record<string, number> = {};
  for (const key of ["line", "lines", "column", "records", "index"]) {
    if (typeof source[key] === "number") evidence[key] = source[key];
  }
  return Object.keys(evidence).length > 0 ? evidence : undefined;
}
