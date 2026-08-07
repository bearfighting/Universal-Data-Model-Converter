import type { SchemaDiagnostic } from "../schema/types.js";
import {
  schemaArrayNode,
  schemaDocument,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaScalarNode,
  schemaUnknownNode,
} from "../schema/factories.js";
import type { SchemaDocument, SchemaNode } from "../schema/types.js";
import type { ValueDocument, ValueNode } from "./types.js";

export type JsonCompatibleValue =
  | string
  | number
  | boolean
  | null
  | JsonCompatibleValue[]
  | { [key: string]: JsonCompatibleValue };

export interface ValueValidationResult {
  ok: true;
}

export interface ValueValidationFailureResult {
  ok: false;
  diagnostics: SchemaDiagnostic[];
}

export function valueDocumentFromJsonCompatible(
  name: string,
  value: JsonCompatibleValue,
): ValueDocument {
  return {
    kind: "value-document",
    name,
    root: valueNodeFromJsonCompatible(value),
  };
}

export function valueNodeToJsonCompatible(
  node: ValueNode,
): JsonCompatibleValue {
  switch (node.kind) {
    case "string":
    case "number":
    case "boolean":
      return node.value;
    case "null":
      return null;
    case "array":
      return node.items.map(valueNodeToJsonCompatible);
    case "object": {
      const value: Record<string, JsonCompatibleValue> = Object.create(null);
      for (const field of node.fields) {
        value[field.name] = valueNodeToJsonCompatible(field.value);
      }
      return value;
    }
    default:
      return assertNeverValueNode(node);
  }
}

export function tryValidateValueDocument(
  document: ValueDocument,
): ValueValidationResult | ValueValidationFailureResult {
  const diagnostics: SchemaDiagnostic[] = [];

  if (!isRecord(document) || document.kind !== "value-document") {
    diagnostics.push(
      valueDiagnostic(
        "invalid-value-document",
        'Value IR must use kind \\"value-document\\".',
      ),
    );
    return { ok: false, diagnostics };
  }

  if (typeof document.name !== "string" || document.name.trim().length === 0) {
    diagnostics.push(
      valueDiagnostic(
        "invalid-value-document",
        "Value IR documents must use a non-empty name.",
      ),
    );
  }

  if (!("root" in document)) {
    diagnostics.push(
      valueDiagnostic(
        "invalid-value-root",
        "Value IR documents must define a root node.",
      ),
    );
  } else {
    validateValueNode(document.root, [], diagnostics);
  }

  return diagnostics.length === 0 ? { ok: true } : { ok: false, diagnostics };
}

export function inferSchemaDocumentFromValueDocument(
  document: ValueDocument,
): SchemaDocument {
  const validation = tryValidateValueDocument(document);
  if (!validation.ok) {
    throw new Error(validation.diagnostics[0]?.message ?? "Invalid Value IR.");
  }

  return schemaDocument(document.name, inferSchemaNode(document.root));
}

function valueNodeFromJsonCompatible(value: JsonCompatibleValue): ValueNode {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value === null
      ? { kind: "null", value: null }
      : typeof value === "string"
        ? { kind: "string", value }
        : typeof value === "number"
          ? { kind: "number", value }
          : { kind: "boolean", value };
  }

  if (Array.isArray(value)) {
    return {
      kind: "array",
      items: value.map(valueNodeFromJsonCompatible),
    };
  }

  return {
    kind: "object",
    fields: Object.entries(value).map(([name, fieldValue]) => ({
      name,
      value: valueNodeFromJsonCompatible(fieldValue),
    })),
  };
}

function validateValueNode(
  node: unknown,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): void {
  if (!isRecord(node) || typeof node.kind !== "string") {
    diagnostics.push(
      valueDiagnostic(
        "invalid-value-kind",
        "Value IR nodes must declare a valid kind.",
        path,
      ),
    );
    return;
  }

  switch (node.kind) {
    case "string":
      validateScalarPayload(
        node,
        "string",
        typeof node.value === "string",
        path,
        diagnostics,
      );
      return;
    case "number":
      validateScalarPayload(
        node,
        "number",
        typeof node.value === "number",
        path,
        diagnostics,
      );
      if (typeof node.value === "number" && !Number.isFinite(node.value)) {
        diagnostics.push(
          valueDiagnostic(
            "invalid-value-number",
            "Value IR numbers must be finite.",
            path,
          ),
        );
      }
      return;
    case "boolean":
      validateScalarPayload(
        node,
        "boolean",
        typeof node.value === "boolean",
        path,
        diagnostics,
      );
      return;
    case "null":
      validateScalarPayload(
        node,
        "null",
        node.value === null,
        path,
        diagnostics,
      );
      return;
    case "array":
      if (!Array.isArray(node.items)) {
        diagnostics.push(
          valueDiagnostic(
            "invalid-value-array",
            "Value IR arrays must contain an items array.",
            path,
          ),
        );
        return;
      }
      node.items.forEach((item, index) =>
        validateValueNode(item, [...path, String(index)], diagnostics),
      );
      return;
    case "object": {
      if (!Array.isArray(node.fields)) {
        diagnostics.push(
          valueDiagnostic(
            "invalid-value-object",
            "Value IR objects must contain a fields array.",
            path,
          ),
        );
        return;
      }
      const names = new Set<string>();
      for (const [index, field] of node.fields.entries()) {
        if (
          !isRecord(field) ||
          typeof field.name !== "string" ||
          !("value" in field)
        ) {
          diagnostics.push(
            valueDiagnostic(
              "invalid-value-field",
              "Value IR object fields must contain a string name and a value.",
              [...path, String(index)],
            ),
          );
          continue;
        }
        if (names.has(field.name)) {
          diagnostics.push(
            valueDiagnostic(
              "duplicate-value-field-name",
              `Value IR objects cannot contain duplicate field name "${field.name}".`,
              [...path, field.name],
            ),
          );
        }
        names.add(field.name);
        validateValueNode(field.value, [...path, field.name], diagnostics);
      }
      return;
    }
    default:
      diagnostics.push(
        valueDiagnostic(
          "invalid-value-kind",
          `Unsupported Value IR node kind "${node.kind}".`,
          path,
        ),
      );
  }
}

function validateScalarPayload(
  node: Record<string, unknown>,
  kind: string,
  valid: boolean,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): void {
  if (!valid) {
    diagnostics.push(
      valueDiagnostic(
        "invalid-value-scalar",
        `Value IR ${kind} nodes must contain a valid scalar value.`,
        path,
      ),
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNeverValueNode(node: Record<string, unknown>): never {
  throw new Error(`Unsupported Value IR node kind: ${String(node)}`);
}

function inferSchemaNode(node: ValueNode): SchemaNode {
  if (node.kind === "string") return schemaScalarNode("string");
  if (node.kind === "boolean") return schemaScalarNode("boolean");
  if (node.kind === "number") {
    return Number.isInteger(node.value)
      ? schemaScalarNode("integer")
      : schemaScalarNode("number");
  }
  if (node.kind === "null") return schemaNullNode();
  if (node.kind === "array") {
    if (node.items.length === 0) {
      return schemaArrayNode(
        schemaUnknownNode({ reason: "empty-array-element" }),
      );
    }

    if (node.items.every((item) => item.kind === "object")) {
      return schemaArrayNode(inferObjectArrayNode(node.items));
    }

    const members = node.items.map(inferSchemaNode);
    const first = members[0]!;
    const compatible = members.every((member) => sameSchemaKind(member, first));
    if (!compatible) {
      throw new Error(
        "The parser could not infer one schema type for mixed array elements.",
      );
    }

    return schemaArrayNode(first);
  }
  return schemaObjectNode(
    node.fields.map((field) =>
      schemaFieldNode(field.name, inferSchemaNode(field.value)),
    ),
  );
}

function inferObjectArrayNode(
  items: Extract<ValueNode, { kind: "object" }>[],
): SchemaNode {
  const fieldsByName = new Map<string, ValueNode[]>();

  for (const item of items) {
    for (const field of item.fields) {
      const values = fieldsByName.get(field.name) ?? [];
      values.push(field.value);
      fieldsByName.set(field.name, values);
    }
  }

  const fields = [...fieldsByName.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, values]) => {
      const nonNullValues = values.filter((value) => value.kind !== "null");
      const type =
        nonNullValues.length === 0
          ? schemaNullNode()
          : inferCompatibleSchemaNode(nonNullValues);
      return schemaFieldNode(name, type, {
        required: values.length === items.length,
        nullable:
          nonNullValues.length > 0 && nonNullValues.length < values.length,
      });
    });

  return schemaObjectNode(fields);
}

function inferCompatibleSchemaNode(nodes: ValueNode[]): SchemaNode {
  const inferred = nodes.map(inferSchemaNode);
  const first = inferred[0]!;
  if (!inferred.every((node) => sameSchemaKind(node, first))) {
    throw new Error(
      "The parser could not infer one schema type for mixed object field values.",
    );
  }
  return first;
}

function sameSchemaKind(left: SchemaNode, right: SchemaNode): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "scalar" && right.kind === "scalar") {
    return left.scalar === right.scalar;
  }
  if (left.kind === "null" || right.kind === "null") return true;
  if (left.kind === "object" && right.kind === "object") {
    return (
      left.fields.length === right.fields.length &&
      left.fields.every((field, index) => {
        const other = right.fields[index];
        return (
          other !== undefined &&
          field.name.source === other.name.source &&
          sameSchemaKind(field.type, other.type)
        );
      })
    );
  }
  if (left.kind === "array" && right.kind === "array") {
    return sameSchemaKind(left.elementType, right.elementType);
  }
  if (left.kind === "union" && right.kind === "union") {
    return (
      left.members.length === right.members.length &&
      left.members.every((member, index) => {
        const other = right.members[index];
        return other !== undefined && sameSchemaKind(member, other);
      })
    );
  }
  return true;
}

function valueDiagnostic(
  code: string,
  message: string,
  path?: string[],
): SchemaDiagnostic {
  return {
    severity: "error",
    code,
    message,
    source: "core-value",
    ...(path && path.length > 0 ? { path } : {}),
  };
}
