import {
  schemaArrayNode,
  schemaDocument,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  schemaDefinition,
  type SchemaDocument,
  type SchemaNode,
} from "@schema-transformation-toolkit/core";
import {
  parsePythonType,
  type PythonClassSyntax,
  type PythonTypeSyntax,
} from "./syntax.js";

export class PythonSemanticError extends Error {
  constructor(
    readonly code:
      | "ambiguous-python-entry"
      | "missing-python-entry"
      | "duplicate-python-definition"
      | "invalid-python-data-model"
      | "unsupported-python-type",
    message: string,
  ) {
    super(message);
    this.name = "PythonSemanticError";
  }
}

export function mapPythonFile(
  file: { classes: PythonClassSyntax[] },
  name: string,
  entry?: string,
): SchemaDocument {
  if (!file.classes.length)
    throw new PythonSemanticError(
      "invalid-python-data-model",
      "Python source must declare at least one @dataclass.",
    );
  const root = entry
    ? file.classes.find((item) => item.name === entry)
    : file.classes.length === 1
      ? file.classes[0]
      : undefined;
  if (!root)
    throw new PythonSemanticError(
      entry ? "missing-python-entry" : "ambiguous-python-entry",
      entry
        ? `Python entry dataclass "${entry}" was not found.`
        : "Python source has multiple dataclasses; an entry option is required.",
    );
  const names = new Set(file.classes.map((item) => item.name));
  const mapped = new Map(
    file.classes.map((item) => [item.name, mapClass(item, names)] as const),
  );
  return schemaDocument(name, mapped.get(root.name)!, {
    definitions: file.classes
      .filter((item) => item !== root)
      .map((item) => schemaDefinition(item.name, mapped.get(item.name)!)),
  });
}

function mapClass(item: PythonClassSyntax, names: Set<string>): SchemaNode {
  return schemaObjectNode(
    item.fields.map((field) => {
      const parsed = mapType(parsePythonType(field.annotation), names);
      return schemaFieldNode(field.name, parsed.node, {
        required: true,
        nullable: parsed.nullable,
      });
    }),
  );
}

function mapType(
  type: PythonTypeSyntax,
  names: Set<string>,
  nested = false,
): { node: SchemaNode; nullable: boolean } {
  if (type.kind === "union") {
    const members = type.members ?? [];
    const nullMembers = members.filter(
      (member) => member.kind === "name" && member.name === "None",
    );
    if (nullMembers.length !== 1 || members.length !== 2)
      throw new PythonSemanticError(
        "unsupported-python-type",
        "Python V1 only supports nullable unions of the form T | None.",
      );
    const other = members.find(
      (member) => !(member.kind === "name" && member.name === "None"),
    )!;
    const mapped = mapType(other, names, nested);
    return nested
      ? {
          node: schemaUnionNode([mapped.node, schemaNullNode()]),
          nullable: false,
        }
      : { ...mapped, nullable: true };
  }
  if (type.kind === "generic") {
    const args = type.arguments ?? [];
    if (type.name === "list") {
      if (args.length !== 1)
        throw new PythonSemanticError(
          "unsupported-python-type",
          "list[T] requires exactly one type argument.",
        );
      const mapped = mapType(args[0]!, names, true);
      return { node: schemaArrayNode(mapped.node), nullable: false };
    }
    if (type.name === "Optional") {
      if (args.length !== 1)
        throw new PythonSemanticError(
          "unsupported-python-type",
          "Optional[T] requires exactly one type argument.",
        );
      const mapped = mapType(args[0]!, names, nested);
      return nested
        ? {
            node: schemaUnionNode([mapped.node, schemaNullNode()]),
            nullable: false,
          }
        : { ...mapped, nullable: true };
    }
    throw new PythonSemanticError(
      "unsupported-python-type",
      `Python generic type "${type.name}" is not supported in V1.`,
    );
  }
  if (type.name === "str")
    return { node: schemaScalarNode("string"), nullable: false };
  if (type.name === "int")
    return { node: schemaScalarNode("integer"), nullable: false };
  if (type.name === "float")
    return { node: schemaScalarNode("number"), nullable: false };
  if (type.name === "bool")
    return { node: schemaScalarNode("boolean"), nullable: false };
  if (type.name === "None") return { node: schemaNullNode(), nullable: false };
  if (type.name && names.has(type.name))
    return { node: schemaReferenceNode(type.name), nullable: false };
  throw new PythonSemanticError(
    "unsupported-python-type",
    `Python type "${type.name ?? "unknown"}" is not supported or is not a known dataclass reference.`,
  );
}
