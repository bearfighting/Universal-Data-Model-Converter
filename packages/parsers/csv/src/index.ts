export {
  tryInferCsvDocument,
  tryParseCsvDocument,
  tryParseCsvValueDocument,
  type CsvParseFailureResult,
  type CsvParseResult,
  type CsvParseSuccessResult,
  type CsvValueParseResult,
  type CsvValueParseSuccessResult,
} from "./api.js";
export { csvParserCapabilities } from "./capabilities.js";
export { csvParserDescriptor } from "./descriptor.js";
export { csvParserOptionCatalog } from "./option-metadata.js";
export type { CsvParseOptions } from "./options.js";

import { csvParserDescriptor } from "./descriptor.js";

export const csvParser = {
  format: csvParserDescriptor.format,
  parse(input: string, options: import("./options.js").CsvParseOptions = {}) {
    return csvParserDescriptor.parse(input, {
      name: options.name ?? "CsvDocument",
      options,
    });
  },
};
