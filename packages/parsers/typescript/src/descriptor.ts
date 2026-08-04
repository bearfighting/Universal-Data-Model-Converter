import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { typeScriptParserCapabilities } from "./capabilities.js";
import { typeScriptParserOptionCatalog } from "./option-metadata.js";
import { tryInferTypeScriptDocumentWithOptions } from "./api.js";
import type { TypeScriptParseOptions } from "./options.js";

export const typeScriptParserDescriptor: ParserDescriptor = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "typescript",
  capabilities: typeScriptParserCapabilities,
  options: typeScriptParserOptionCatalog,
  parse(input: string, context: ParserExecutionContext): ParseResult {
    return tryInferTypeScriptDocumentWithOptions(input, {
      ...((context.options ?? {}) as TypeScriptParseOptions),
      name: context.name,
    });
  },
};
