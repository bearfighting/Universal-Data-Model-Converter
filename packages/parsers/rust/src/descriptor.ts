import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { rustParserCapabilities } from "./capabilities.js";
import { rustParserOptionCatalog } from "./option-metadata.js";
import { tryParseRust } from "./api.js";
import type { RustParseOptions } from "./options.js";

export const rustParserDescriptor: ParserDescriptor<
  SchemaDocument,
  RustParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "rust",
  capabilities: rustParserCapabilities,
  options: rustParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<RustParseOptions>,
  ): ParseResult<SchemaDocument> {
    const result = tryParseRust(input, {
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
