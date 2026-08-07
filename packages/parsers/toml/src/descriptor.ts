import type {
  ParseResult,
  IrDocument,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import { tryParseTomlDocument, tryParseTomlValueDocument } from "./api.js";
import { tomlParserCapabilities } from "./capabilities.js";
import { tomlParserOptionCatalog } from "./option-metadata.js";
import type { TomlParseOptions } from "./options.js";

export const tomlParserDescriptor: ParserDescriptor<
  IrDocument,
  TomlParseOptions
> = {
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
    if (context.requestedIr === "value") {
      const result = tryParseTomlValueDocument(input, options);
      if (!result.ok) return result;
      return { ok: true, document: result.document };
    }
    const result = tryParseTomlDocument(input, options);
    if (!result.ok) return result;
    return {
      ok: true,
      document: result.document,
      artifacts: { value: result.value },
      ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
    };
  },
};
