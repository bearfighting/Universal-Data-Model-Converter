import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { jsonSchemaParserCapabilities } from "./capabilities.js";
import { jsonSchemaParserOptionCatalog } from "./option-metadata.js";
import { tryInferJsonSchemaDocumentWithOptions } from "./api.js";
import type { JsonSchemaParseOptions } from "./options.js";

export const jsonSchemaParserDescriptor: ParserDescriptor = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "json-schema",
  capabilities: jsonSchemaParserCapabilities,
  options: jsonSchemaParserOptionCatalog,
  parse(input: string, context: ParserExecutionContext): ParseResult {
    return tryInferJsonSchemaDocumentWithOptions(input, {
      ...((context.options ?? {}) as JsonSchemaParseOptions),
      name: context.name,
    });
  },
};
