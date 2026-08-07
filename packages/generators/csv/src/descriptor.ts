import type {
  GeneratorDescriptor,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { tryGenerateCsv } from "./api.js";
import { csvGeneratorCapabilities } from "./capabilities.js";
import { csvGeneratorOptionCatalog } from "./option-metadata.js";
import type { CsvGeneratorOptions } from "./options.js";

export const csvGeneratorDescriptor: GeneratorDescriptor<string> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "csv",
  capabilities: csvGeneratorCapabilities,
  options: csvGeneratorOptionCatalog,
  generate(document, context) {
    if (document.kind !== "value-document") {
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
    return tryGenerateCsv(
      document as ValueDocument,
      (context.options ?? {}) as CsvGeneratorOptions,
    );
  },
};
