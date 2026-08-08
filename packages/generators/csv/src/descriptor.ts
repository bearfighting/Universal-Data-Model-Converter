import { isIrBundle } from "@schema-transformation-toolkit/core";
import type {
  GeneratorDescriptor,
  IrBundle,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { tryGenerateCsv } from "./api.js";
import { csvGeneratorCapabilities } from "./capabilities.js";
import { csvGeneratorOptionCatalog } from "./option-metadata.js";
import type { CsvGeneratorOptions } from "./options.js";

export const csvGeneratorDescriptor: GeneratorDescriptor<
  ValueDocument,
  string,
  CsvGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "csv",
  capabilities: csvGeneratorCapabilities,
  options: csvGeneratorOptionCatalog,
  generate(input: IrBundle<ValueDocument>, context) {
    if (!isIrBundle(input) || input.document.kind !== "value-document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The CSV generator requires Value IR.",
        diagnostics: [
          {
            severity: "error",
            code: "invalid-generator-input",
            message: "The CSV generator requires Value IR.",
            source: "generator-csv",
          },
        ],
      };
    }
    return tryGenerateCsv(input.document, context.options ?? {});
  },
};
