import type {
  ParseFailureResult,
  ValueDocument,
  ValueNode,
} from "@schema-transformation-toolkit/core";
import { valueDocument } from "@schema-transformation-toolkit/core";
import { tomlFailure } from "./errors.js";

export type TomlLowerResult =
  { ok: true; document: ValueDocument } | ParseFailureResult<string>;

export function lowerTomlValue(name: string, value: unknown): TomlLowerResult {
  if (!isPlainObject(value)) {
    return tomlFailure(
      "invalid-toml",
      "TOML documents must lower to an object root.",
    );
  }

  const root = lowerNode(value, []);
  if (!root.ok) return root;
  return { ok: true, document: valueDocument(name, root.node) };
}

function lowerNode(
  value: unknown,
  path: string[],
): { ok: true; node: ValueNode } | ParseFailureResult<string> {
  if (value === null) {
    return tomlFailure(
      "toml-unsupported-value",
      "TOML null values are not supported by the Value IR profile.",
      { path },
    );
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return { ok: true, node: { kind: typeof value, value } as ValueNode };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return tomlFailure(
        "toml-unsupported-value",
        "TOML non-finite numbers are not supported by the Value IR profile.",
        { path },
      );
    }
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      return tomlFailure(
        "toml-unsafe-integer",
        "TOML integers outside the JavaScript safe integer range cannot be represented losslessly.",
        { path, value },
      );
    }
    return { ok: true, node: { kind: "number", value } };
  }

  if (Array.isArray(value)) {
    const items: ValueNode[] = [];
    for (const [index, item] of value.entries()) {
      const result = lowerNode(item, [...path, String(index)]);
      if (!result.ok) return result;
      items.push(result.node);
    }
    return { ok: true, node: { kind: "array", items } };
  }

  if (isPlainObject(value)) {
    const fields = [];
    for (const [name, fieldValue] of Object.entries(value)) {
      const result = lowerNode(fieldValue, [...path, name]);
      if (!result.ok) return result;
      fields.push({ name, value: result.node });
    }
    return { ok: true, node: { kind: "object", fields } };
  }

  return tomlFailure(
    "toml-unsupported-value",
    "TOML values outside the supported Value IR profile are not supported.",
    { path, valueType: typeof value },
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
