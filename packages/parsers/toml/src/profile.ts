import type {
  ParseFailureResult,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { inferSchemaDocumentFromValueDocument } from "@schema-transformation-toolkit/core/internal";
import { tomlFailure } from "./errors.js";
import type { TomlLowerResult } from "./lower.js";

export interface TomlProfileSuccess {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
}

export type TomlProfileResult = TomlProfileSuccess | ParseFailureResult<string>;

export function inferTomlShape(
  valueResult: TomlLowerResult,
): TomlProfileResult {
  if (!valueResult.ok) return valueResult;
  try {
    return {
      ok: true,
      value: valueResult.document,
      document: inferSchemaDocumentFromValueDocument(valueResult.document),
    };
  } catch (error) {
    return tomlFailure(
      "invalid-toml",
      `The TOML value could not be inferred as Shape IR: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
