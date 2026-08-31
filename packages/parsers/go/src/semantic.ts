import {
  constraintDocument,
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnknownNode,
  schemaUnionNode,
  type SchemaDocument,
  type SchemaNode,
  type SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import type { GoFieldSyntax, GoFileSyntax, GoTypeSyntax } from "./syntax.js";

export class GoSemanticError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly position?: { offset: number; line: number; column: number },
  ) {
    super(message);
    this.name = "GoSemanticError";
  }
}
export interface GoSemanticResult {
  document: SchemaDocument;
  constraints: ReturnType<typeof constraintDocument>;
  semanticNotes: SchemaSemanticNote[];
}

const integer: Record<
  string,
  { signedness: "signed" | "unsigned"; widthBits: 8 | 16 | 32 | 64 | "pointer" }
> = {
  int: { signedness: "signed", widthBits: "pointer" },
  int8: { signedness: "signed", widthBits: 8 },
  int16: { signedness: "signed", widthBits: 16 },
  int32: { signedness: "signed", widthBits: 32 },
  int64: { signedness: "signed", widthBits: 64 },
  uint: { signedness: "unsigned", widthBits: "pointer" },
  uint8: { signedness: "unsigned", widthBits: 8 },
  uint16: { signedness: "unsigned", widthBits: 16 },
  uint32: { signedness: "unsigned", widthBits: 32 },
  uint64: { signedness: "unsigned", widthBits: 64 },
  byte: { signedness: "unsigned", widthBits: 8 },
  rune: { signedness: "signed", widthBits: 32 },
};

export function mapGoFile(
  file: GoFileSyntax,
  name: string,
  entry?: string,
): GoSemanticResult {
  if (!file.declarations.length)
    throw new GoSemanticError(
      "invalid-go-data-model",
      "Go source must declare at least one type.",
    );
  const names = new Set<string>();
  for (const declaration of file.declarations) {
    if (names.has(declaration.name))
      throw new GoSemanticError(
        "duplicate-go-definition",
        `Duplicate Go definition "${declaration.name}".`,
        declaration.position,
      );
    names.add(declaration.name);
  }
  const alias = file.declarations.find(
    (declaration) => declaration.kind === "alias",
  );
  if (alias)
    throw new GoSemanticError(
      "unsupported-go-feature",
      `Go alias "${alias.name}" is not supported in V1 because the shared IR cannot preserve alias identity.`,
      alias.position,
    );
  const root = entry
    ? file.declarations.find((item) => item.name === entry)
    : file.declarations.length === 1
      ? file.declarations[0]
      : undefined;
  if (!root)
    throw new GoSemanticError(
      entry ? "missing-go-entry" : "ambiguous-go-entry",
      entry
        ? `Go entry type "${entry}" was not found.`
        : "Go source has multiple declarations; an entry option is required.",
    );
  const notes: SchemaSemanticNote[] = [];
  const mapped = new Map<string, SchemaNode>();
  for (const declaration of file.declarations)
    mapped.set(
      declaration.name,
      mapType(declaration.type, names, notes, [
        "definitions",
        declaration.name,
      ]),
    );
  const rootNode = mapped.get(root.name)!;
  const rootReferenced = file.declarations.some((item) =>
    references(mapped.get(item.name)!, root.name),
  );
  const definitions = file.declarations
    .filter((item) => item !== root || rootReferenced)
    .map((item) => schemaDefinition(item.name, mapped.get(item.name)!));
  return {
    document: schemaDocument(
      name,
      rootReferenced ? schemaReferenceNode(root.name) : rootNode,
      { rootName: root.name, definitions },
    ),
    constraints: constraintDocument(name, []),
    semanticNotes: notes,
  };
}

function mapType(
  type: GoTypeSyntax,
  names: Set<string>,
  notes: SchemaSemanticNote[],
  path: string[],
): SchemaNode {
  if (type.kind === "pointer") {
    notes.push(
      note(
        "go-pointer-nullable",
        "Go pointer semantics were interpreted as nullable value semantics.",
        path,
        "widening",
      ),
    );
    const inner = mapType(type.element!, names, notes, path);
    return schemaUnionNode([inner, schemaNullNode()]);
  }
  if (type.kind === "slice")
    return schemaArrayNode(
      mapType(type.element!, names, notes, [...path, "items"]),
    );
  if (type.kind === "array") {
    notes.push(
      note(
        "go-fixed-array-widened",
        `Go fixed array length ${type.length} was widened to a variable-length array.`,
        path,
        "loss",
      ),
    );
    return schemaArrayNode(
      mapType(type.element!, names, notes, [...path, "items"]),
    );
  }
  if (type.kind === "map") {
    if (type.key?.kind !== "name" || type.key.name !== "string")
      throw new GoSemanticError(
        "unsupported-go-map-key",
        "Only map[string]T is representable as a schema record.",
        type.key?.position,
      );
    return schemaRecordNode(
      schemaScalarNode("string"),
      mapType(type.value!, names, notes, [...path, "value"]),
    );
  }
  if (type.kind === "struct") {
    const fields = (type.fields ?? []).flatMap((field) =>
      mapField(field, names, notes, path),
    );
    return schemaObjectNode(fields);
  }
  if (type.kind === "interface") {
    if (!type.empty)
      throw new GoSemanticError(
        "unsupported-go-feature",
        "Go interfaces with methods or embedded interfaces are not supported in V1.",
        type.position,
      );
    return schemaUnknownNode({ reason: "no-evidence" });
  }
  const name = type.name!;
  if (name === "string") return schemaScalarNode("string");
  if (name === "bool") return schemaScalarNode("boolean");
  if (name === "float32")
    return schemaScalarNode("number", {
      representation: { family: "float", widthBits: 32 },
    });
  if (name === "float64")
    return schemaScalarNode("number", {
      representation: { family: "float", widthBits: 64 },
    });
  if (integer[name])
    return schemaScalarNode("integer", {
      representation: { family: "integer", ...integer[name] },
    });
  if (name === "any") return schemaUnknownNode();
  if (names.has(name)) return schemaReferenceNode(name);
  throw new GoSemanticError(
    "unknown-go-reference",
    `Go type "${name}" is not a known declaration or supported builtin.`,
    type.position,
  );
}
function mapField(
  field: GoFieldSyntax,
  names: Set<string>,
  notes: SchemaSemanticNote[],
  path: string[],
) {
  if (field.embedded)
    throw new GoSemanticError(
      "unsupported-go-feature",
      "Embedded-field promotion is not supported in Go V1.",
      field.position,
    );
  if (!field.exported) {
    notes.push(
      note(
        "go-unexported-field-ignored",
        `Ignored unexported Go field "${field.name}".`,
        [...path, field.name ?? "field"],
        "policy",
      ),
    );
    return [];
  }
  const tag = field.tag;
  if (tag?.options.includes("-")) {
    notes.push(
      note(
        "go-json-field-ignored",
        `Field "${field.name}" was excluded by json:"-".`,
        [...path, field.name!],
        "policy",
      ),
    );
    return [];
  }
  const jsonName = tag?.name ?? field.name!;
  const optional = tag?.options.includes("omitempty") ?? false;
  const type = mapType(field.type, names, notes, [...path, jsonName]);
  const nullable =
    type.kind === "union" &&
    type.members.some((member) => member.kind === "null");
  const fieldType =
    nullable && type.kind === "union"
      ? type.members.filter((member) => member.kind !== "null").length === 1
        ? type.members.find((member) => member.kind !== "null")!
        : schemaUnionNode(
            type.members.filter((member) => member.kind !== "null"),
          )
      : type;
  return [
    schemaFieldNode(jsonName, fieldType, { required: !optional, nullable }),
  ];
}
function references(node: SchemaNode, name: string): boolean {
  if (node.kind === "reference") return node.name === name;
  if (node.kind === "array") return references(node.elementType, name);
  if (node.kind === "record") return references(node.value, name);
  if (node.kind === "union")
    return node.members.some((member) => references(member, name));
  if (node.kind === "object")
    return node.fields.some((field) => references(field.type, name));
  return false;
}
function note(
  code: string,
  message: string,
  path: string[],
  kind: SchemaSemanticNote["kind"],
): SchemaSemanticNote {
  return { kind, code, message, path, source: "parser-go", layer: "shape" };
}
