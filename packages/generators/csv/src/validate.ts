import type {
  ValueDocument,
  ValueNode,
} from "@schema-transformation-toolkit/core";
import { tryValidateValueDocument } from "@schema-transformation-toolkit/core/internal";
import type { CsvGeneratorOptions } from "./options.js";

export interface CsvValidationSuccess {
  ok: true;
  columns: string[];
  rows: string[][];
  textified: boolean;
  textifiedCount: number;
}

export interface CsvValidationFailure {
  ok: false;
  code: string;
  message: string;
}

export type CsvValidationResult = CsvValidationSuccess | CsvValidationFailure;

export function validateCsvValue(
  document: ValueDocument,
  options: CsvGeneratorOptions,
): CsvValidationResult {
  const valueValidation = tryValidateValueDocument(document);
  if (!valueValidation.ok) {
    return {
      ok: false,
      code: "invalid-generator-input",
      message:
        valueValidation.diagnostics[0]?.message ?? "The Value IR is invalid.",
    };
  }

  if (document.root.kind !== "array") {
    return failure(
      "invalid-generator-input",
      "The CSV generator requires an array Value IR root.",
    );
  }

  if (document.root.items.length === 0) {
    const columns = options.columns ?? [];
    const columnsFailure = validateColumns(columns);
    if (columnsFailure) return columnsFailure;
    return { ok: true, columns, rows: [], textified: false, textifiedCount: 0 };
  }

  const first = document.root.items[0];
  if (!first || first.kind !== "object") {
    return failure(
      "invalid-generator-input",
      "CSV rows must be Value IR objects.",
    );
  }

  const columns = first.fields.map((field) => field.name);
  const columnsFailure = validateColumns(columns);
  if (columnsFailure) return columnsFailure;

  if (options.columns) {
    if (!sameColumns(options.columns, columns)) {
      return failure(
        "csv-inconsistent-columns",
        "Explicit CSV columns must match the Value IR row fields.",
      );
    }
  }

  let textified = false;
  let textifiedCount = 0;
  const rows: string[][] = [];
  for (const item of document.root.items) {
    if (item.kind !== "object") {
      return failure(
        "invalid-generator-input",
        "CSV rows must be Value IR objects.",
      );
    }

    const fields = new Map(
      item.fields.map((field) => [field.name, field.value]),
    );
    if (
      fields.size !== columns.length ||
      columns.some((column) => !fields.has(column))
    ) {
      return failure(
        "csv-inconsistent-columns",
        "All CSV rows must contain the same columns.",
      );
    }

    const row: string[] = [];
    for (const column of columns) {
      const cell = fields.get(column)!;
      const result = scalarToCsvCell(cell);
      if (!result.ok) return result;
      row.push(result.value);
      textified ||= result.textified;
      if (result.textified) textifiedCount += 1;
    }
    rows.push(row);
  }

  return { ok: true, columns, rows, textified, textifiedCount };
}

function scalarToCsvCell(
  node: ValueNode,
): { ok: true; value: string; textified: boolean } | CsvValidationFailure {
  if (node.kind === "string")
    return { ok: true, value: node.value, textified: false };
  if (node.kind === "number") {
    return Number.isFinite(node.value)
      ? { ok: true, value: String(node.value), textified: true }
      : failure(
          "csv-unsupported-value",
          "CSV cells must contain finite scalar values.",
        );
  }
  if (node.kind === "boolean") {
    return { ok: true, value: String(node.value), textified: true };
  }
  return failure(
    "csv-unsupported-value",
    "CSV cells cannot contain null, arrays, or nested objects.",
  );
}

function validateColumns(columns: string[]): CsvValidationFailure | undefined {
  if (columns.length === 0) {
    return failure(
      "csv-empty-columns",
      "CSV output requires at least one column.",
    );
  }
  if (columns.some((column) => column.length === 0)) {
    return failure("csv-empty-columns", "CSV columns must not be empty.");
  }
  if (new Set(columns).size !== columns.length) {
    return failure("csv-inconsistent-columns", "CSV columns must be unique.");
  }
  return undefined;
}

function sameColumns(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((column) => right.includes(column))
  );
}

function failure(code: string, message: string): CsvValidationFailure {
  return { ok: false, code, message };
}
