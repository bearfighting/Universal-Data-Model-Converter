import type {
  ValueDocument,
  ValueNode,
} from "@schema-transformation-toolkit/core";
import { tryValidateValueDocument } from "@schema-transformation-toolkit/core/internal";
import type { TomlGeneratorOptions } from "./options.js";

export interface TomlValidationSuccess {
  ok: true;
  value: Record<string, unknown>;
}

export interface TomlValidationFailure {
  ok: false;
  code: string;
  message: string;
}

export type TomlValidationResult =
  TomlValidationSuccess | TomlValidationFailure;

export function validateTomlValue(
  document: ValueDocument,
  options: TomlGeneratorOptions,
): TomlValidationResult {
  void options;
  const validation = tryValidateValueDocument(document);
  if (!validation.ok) {
    const diagnosticCode = validation.diagnostics[0]?.code;
    return {
      ok: false,
      code:
        diagnosticCode === "invalid-value-number"
          ? "toml-non-json-value"
          : "invalid-generator-input",
      message: validation.diagnostics[0]?.message ?? "The Value IR is invalid.",
    };
  }

  if (document.root.kind !== "object") {
    return failure(
      "toml-invalid-root",
      "The TOML generator requires an object Value IR root.",
    );
  }

  const value = nodeToTomlValue(document.root, []);
  if (!value.ok) return value;
  return { ok: true, value: value.value as Record<string, unknown> };
}

function nodeToTomlValue(
  node: ValueNode,
  path: string[],
): { ok: true; value: unknown } | TomlValidationFailure {
  switch (node.kind) {
    case "string":
    case "boolean":
      return { ok: true, value: node.value };
    case "number":
      if (!Number.isFinite(node.value)) {
        return failure(
          "toml-non-json-value",
          "TOML output cannot contain non-finite numbers.",
        );
      }
      if (Number.isInteger(node.value) && !Number.isSafeInteger(node.value)) {
        return failure(
          "toml-non-json-value",
          "TOML output cannot represent unsafe integers losslessly.",
        );
      }
      return { ok: true, value: node.value };
    case "null":
      return failure(
        "toml-unsupported-value",
        `TOML output does not support null at ${path.join(".") || "root"}.`,
      );
    case "array": {
      const values: unknown[] = [];
      for (const [index, item] of node.items.entries()) {
        const result = nodeToTomlValue(item, [...path, String(index)]);
        if (!result.ok) return result;
        values.push(result.value);
      }
      return { ok: true, value: values };
    }
    case "object": {
      const value: Record<string, unknown> = Object.create(null);
      for (const field of node.fields) {
        const result = nodeToTomlValue(field.value, [...path, field.name]);
        if (!result.ok) return result;
        value[field.name] = result.value;
      }
      return { ok: true, value };
    }
    default:
      return failure(
        "toml-unsupported-value",
        "TOML output contains an unsupported Value IR node.",
      );
  }
}

function failure(code: string, message: string): TomlValidationFailure {
  return { ok: false, code, message };
}
