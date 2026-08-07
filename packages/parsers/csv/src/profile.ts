import type {
  ParseFailureResult,
  SchemaDiagnostic,
} from "@schema-transformation-toolkit/core";
import {
  schemaArrayNode,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaScalarNode,
  valueArrayNode,
  valueDocument,
  valueObjectField,
  valueObjectNode,
  valueScalarNode,
  type SchemaDocument,
  type ValueDocument,
} from "@schema-transformation-toolkit/core";
import type { CsvRecords } from "./parse.js";

export interface CsvProfileSuccess {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
}

export interface CsvValueProfileSuccess {
  ok: true;
  document: ValueDocument;
}

export type CsvProfileResult = CsvProfileSuccess | ParseFailureResult<string>;
export type CsvValueProfileResult =
  CsvValueProfileSuccess | ParseFailureResult<string>;

export function lowerCsvRecords(
  name: string,
  records: CsvRecords,
): CsvProfileResult {
  const profile = validateProfile(records);
  if (!profile.ok) return profile;

  const { headers, rows } = profile;
  const value = lowerRows(name, headers, rows);

  const document = schemaDocument(
    name,
    schemaArrayNode(
      schemaObjectNode(
        headers.map((header) =>
          schemaFieldNode(header, schemaScalarNode("string")),
        ),
      ),
    ),
  );

  return { ok: true, value, document };
}

export function lowerCsvValueRecords(
  name: string,
  records: CsvRecords,
): CsvValueProfileResult {
  const profile = validateProfile(records);
  if (!profile.ok) return profile;
  return { ok: true, document: lowerRows(name, profile.headers, profile.rows) };
}

function lowerRows(name: string, headers: string[], rows: string[][]) {
  return valueDocument(
    name,
    valueArrayNode(
      rows.map((row) =>
        valueObjectNode(
          headers.map((header, index) =>
            valueObjectField(header, valueScalarNode(row[index] ?? "")),
          ),
        ),
      ),
    ),
  );
}

function validateProfile(
  records: CsvRecords,
):
  | { ok: true; headers: string[]; rows: string[][] }
  | ParseFailureResult<string> {
  const headers = records[0];
  if (!headers || headers.length === 0) {
    return failure("csv-empty-document", "The CSV input has no header row.");
  }

  const headerFailure = validateHeaders(headers);
  if (headerFailure) return headerFailure;

  return { ok: true, headers, rows: records.slice(1) };
}

function validateHeaders(
  headers: string[],
): ParseFailureResult<string> | undefined {
  const seen = new Set<string>();
  for (const [index, header] of headers.entries()) {
    if (header.length === 0) {
      return failure("csv-empty-header", "CSV headers must not be empty.", {
        row: 1,
        column: index + 1,
      });
    }
    if (seen.has(header)) {
      return failure(
        "csv-duplicate-header",
        `CSV headers must be unique; "${header}" appears more than once.`,
        { row: 1, column: index + 1, header },
      );
    }
    seen.add(header);
  }
  return undefined;
}

export function failure(
  code: string,
  message: string,
  evidence?: unknown,
): ParseFailureResult<string> {
  const diagnostic: SchemaDiagnostic = {
    severity: "error",
    code,
    message,
    source: "parser-csv",
    ...(evidence === undefined ? {} : { evidence }),
  };
  return { ok: false, code, message, diagnostics: [diagnostic] };
}
