import type {
  ScalarKind,
  SchemaArrayNode,
  SchemaReferenceNode,
  SchemaLiteralNode,
  SchemaNullNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaRecordNode,
  SchemaScalarNode,
  ScalarRepresentationHint,
  SchemaTupleNode,
  SchemaUnionNode,
  SchemaUnknownNode,
} from "./types.js";

export function isSchemaScalarNode(node: SchemaNode): node is SchemaScalarNode {
  return node.kind === "scalar";
}

export function isScalarRepresentationHint(
  value: unknown,
): value is ScalarRepresentationHint {
  if (typeof value !== "object" || value === null) return false;

  const hint = value as {
    family?: unknown;
    signedness?: unknown;
    widthBits?: unknown;
  };

  if (
    hint.family !== "integer" &&
    hint.family !== "float" &&
    hint.family !== "decimal"
  ) {
    return false;
  }

  if (
    hint.signedness !== undefined &&
    (hint.family !== "integer" ||
      (hint.signedness !== "signed" && hint.signedness !== "unsigned"))
  ) {
    return false;
  }

  return (
    hint.widthBits === undefined ||
    hint.widthBits === "pointer" ||
    hint.widthBits === 8 ||
    hint.widthBits === 16 ||
    hint.widthBits === 32 ||
    hint.widthBits === 64 ||
    hint.widthBits === 128
  );
}

export function isCompatibleScalarRepresentation(
  scalar: ScalarKind,
  representation: ScalarRepresentationHint,
): boolean {
  if (!isScalarRepresentationHint(representation)) return false;

  if (representation.family === "integer") return scalar === "integer";

  return scalar === "number" && representation.signedness === undefined;
}

export function isSchemaLiteralNode(
  node: SchemaNode,
): node is SchemaLiteralNode {
  return node.kind === "literal";
}

export function isSchemaReferenceNode(
  node: SchemaNode,
): node is SchemaReferenceNode {
  return node.kind === "reference";
}

export function isSchemaUnionNode(node: SchemaNode): node is SchemaUnionNode {
  return node.kind === "union";
}

export function isSchemaTupleNode(node: SchemaNode): node is SchemaTupleNode {
  return node.kind === "tuple";
}

export function isSchemaRecordNode(node: SchemaNode): node is SchemaRecordNode {
  return node.kind === "record";
}

export function isSchemaNullNode(node: SchemaNode): node is SchemaNullNode {
  return node.kind === "null";
}

export function isSchemaUnknownNode(
  node: SchemaNode,
): node is SchemaUnknownNode {
  return node.kind === "unknown";
}

export function isSchemaObjectNode(node: SchemaNode): node is SchemaObjectNode {
  return node.kind === "object";
}

export function isSchemaArrayNode(node: SchemaNode): node is SchemaArrayNode {
  return node.kind === "array";
}
