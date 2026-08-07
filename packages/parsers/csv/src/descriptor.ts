import type {
  ParseResult,
  IrDocument,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { tryParseCsvDocument, tryParseCsvValueDocument } from "./api.js";
import { csvParserCapabilities } from "./capabilities.js";
import { csvParserOptionCatalog } from "./option-metadata.js";
import type { CsvParseOptions } from "./options.js";

export const csvParserDescriptor: ParserDescriptor<
  IrDocument,
  CsvParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "csv",
  capabilities: csvParserCapabilities,
  options: csvParserOptionCatalog,
  parse(input: string, context: ParserExecutionContext): ParseResult {
    const options = {
      ...((context.options ?? {}) as CsvParseOptions),
      name: context.name,
    };
    if (context.requestedIr === "value") {
      const result = tryParseCsvValueDocument(input, options);
      if (!result.ok) return result;
      return { ok: true, document: result.document };
    }
    const result = tryParseCsvDocument(input, options);
    if (!result.ok) return result;
    return {
      ok: true,
      document: result.document,
      artifacts: { value: result.value },
      ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
    };
  },
};
