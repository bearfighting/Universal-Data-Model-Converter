import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { goParserCapabilities } from "./capabilities.js";
import { goParserOptionCatalog } from "./option-metadata.js";
import { tryParseGo } from "./api.js";
import type { GoParseOptions } from "./options.js";
export const goParserDescriptor: ParserDescriptor<
  SchemaDocument,
  GoParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "go",
  capabilities: goParserCapabilities,
  options: goParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<GoParseOptions>,
  ): ParseResult<SchemaDocument> {
    const result = tryParseGo(input, {
      ...(context.options ?? {}),
      name: context.name,
    });
    if (!result.ok) return result;
    return {
      ok: true,
      document: result.document,
      artifacts: result.artifacts,
      ...(result.semanticNotes ? { semanticNotes: result.semanticNotes } : {}),
    };
  },
};
