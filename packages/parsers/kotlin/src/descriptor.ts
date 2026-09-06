import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { kotlinParserCapabilities } from "./capabilities.js";
import { kotlinParserOptionCatalog } from "./option-metadata.js";
import { tryParseKotlin } from "./api.js";
import type { KotlinParseOptions } from "./options.js";
export const kotlinParserDescriptor: ParserDescriptor<
  SchemaDocument,
  KotlinParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "kotlin",
  capabilities: kotlinParserCapabilities,
  options: kotlinParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<KotlinParseOptions>,
  ): ParseResult<SchemaDocument> {
    const result = tryParseKotlin(input, {
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
