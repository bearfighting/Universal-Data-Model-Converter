import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
} from "@schema-transformation-toolkit/core";
import {
  parseJsonValueDocumentWithOptions,
  tryInferJsonDocumentFromValueDocumentWithOptions,
  tryParseJsonValueDocumentWithOptions,
} from "./value.js";
import { tryInferJsonDocumentWithOptions } from "./schema/parse.js";
import { jsonParserCapabilities } from "./capabilities.js";
import { jsonParserOptionCatalog } from "./option-metadata.js";
import type { JsonParseOptions } from "./schema/options.js";

export const jsonParserDescriptor: ParserDescriptor = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "json",
  capabilities: jsonParserCapabilities,
  options: jsonParserOptionCatalog,
  parse(input: string, context: ParserExecutionContext): ParseResult {
    const options = {
      ...((context.options ?? {}) as JsonParseOptions),
      name: context.name,
    };
    const valueResult = tryParseJsonValueDocumentWithOptions(input, options);

    if (!valueResult.ok) {
      return valueResult;
    }

    if (
      context.requestedIr &&
      !context.requestedIr.includes("shape") &&
      context.requestedIr.includes("value")
    ) {
      return {
        ok: true,
        value: valueResult.document,
      };
    }

    const shapeResult = tryInferJsonDocumentFromValueDocumentWithOptions(
      valueResult.document,
      options,
    );

    if (shapeResult.ok) {
      return {
        ok: true,
        document: shapeResult.document,
        value: valueResult.document,
        ...(shapeResult.diagnostics
          ? { diagnostics: shapeResult.diagnostics }
          : {}),
      };
    }

    const fallback = tryInferJsonDocumentWithOptions(input, options);
    if (!fallback.ok) {
      return fallback;
    }

    return {
      ok: true,
      document: fallback.document,
      value: parseJsonValueDocumentWithOptions(input, options),
      ...(fallback.diagnostics ? { diagnostics: fallback.diagnostics } : {}),
    };
  },
};
