import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { tryParseTomlDocument, tryParseTomlValueDocument } from "./api.js";
import { tomlParserCapabilities } from "./capabilities.js";
import { tomlParserOptionCatalog } from "./option-metadata.js";
import type { TomlParseOptions } from "./options.js";

export const tomlParserDescriptor: ParserDescriptor = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "toml",
  capabilities: tomlParserCapabilities,
  options: tomlParserOptionCatalog,
  parse(input: string, context: ParserExecutionContext): ParseResult {
    const options = {
      ...((context.options ?? {}) as TomlParseOptions),
      name: context.name,
    };
    if (
      context.requestedIr &&
      !context.requestedIr.includes("shape") &&
      context.requestedIr.includes("value")
    ) {
      const result = tryParseTomlValueDocument(input, options);
      if (!result.ok) return result;
      return { ok: true, value: result.document };
    }
    return tryParseTomlDocument(input, options);
  },
};
