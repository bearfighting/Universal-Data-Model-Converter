import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { javaParserCapabilities } from "./capabilities.js";
import { javaParserOptionCatalog } from "./option-metadata.js";
import { tryParseJava } from "./api.js";
import type { JavaParseOptions } from "./options.js";

export const javaParserDescriptor: ParserDescriptor<
  SchemaDocument,
  JavaParseOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "java",
  capabilities: javaParserCapabilities,
  options: javaParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<JavaParseOptions>,
  ): ParseResult<SchemaDocument> {
    const result = tryParseJava(input, {
      ...(context.options ?? {}),
      name: context.name,
    });
    if (!result.ok) return result;
    return {
      ok: true,
      document: result.document,
      ...(result.semanticNotes ? { semanticNotes: result.semanticNotes } : {}),
    };
  },
};
