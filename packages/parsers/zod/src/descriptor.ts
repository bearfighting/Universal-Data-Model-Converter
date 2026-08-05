import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { zodParserCapabilities } from "./capabilities.js";
import { zodParserOptionCatalog } from "./option-metadata.js";
import { tryInferZodDocumentWithOptions } from "./api.js";
import type { ZodParseOptions } from "./options.js";

export const zodParserDescriptor: ParserDescriptor = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "zod",
  capabilities: zodParserCapabilities,
  options: zodParserOptionCatalog,
  parse(input: string, context: ParserExecutionContext): ParseResult {
    return tryInferZodDocumentWithOptions(input, {
      ...((context.options ?? {}) as ZodParseOptions),
      name: context.name,
    });
  },
};
