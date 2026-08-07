import { stringify } from "csv-stringify/sync";
import type {
  GenerateResult,
  SchemaSemanticNote,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { validateCsvValue } from "./validate.js";
import type { CsvGeneratorOptions } from "./options.js";

export type CsvOutput = string;

const csvSemanticNote = (count: number): SchemaSemanticNote => ({
  kind: "widening",
  code: "csv-scalar-textified",
  message: `CSV textified ${count} numeric or boolean Value IR cells; reparsing CSV represents them as strings.`,
  source: "generator-csv",
  layer: "target",
});

export function generateCsv(
  document: ValueDocument,
  options: CsvGeneratorOptions = {},
): CsvOutput {
  const result = tryGenerateCsv(document, options);
  if (!result.ok) {
    throw new Error(
      `CSV generation failed [${result.code}]: ${result.message}`,
    );
  }
  return result.output;
}

export function tryGenerateCsv(
  document: ValueDocument,
  options: CsvGeneratorOptions = {},
): GenerateResult<CsvOutput> {
  const validation = validateCsvValue(document, options);
  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      message: validation.message,
      diagnostics: [
        {
          severity: "error",
          code: validation.code,
          message: validation.message,
          source: "generator-csv",
        },
      ],
    };
  }

  const output = stringify([validation.columns, ...validation.rows], {
    record_delimiter: "\n",
  });
  return {
    ok: true,
    output,
    ...(validation.textified
      ? { semanticNotes: [csvSemanticNote(validation.textifiedCount)] }
      : {}),
  };
}
