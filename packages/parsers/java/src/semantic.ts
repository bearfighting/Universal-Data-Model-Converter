import {
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  type ScalarRepresentationHint,
  type SchemaDocument,
  type SchemaNode,
  type SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import { JavaSemanticError } from "./failure.js";
import type {
  JavaDeclarationSyntax,
  JavaFileSyntax,
  JavaTypeSyntax,
} from "./syntax.js";

interface MappedType {
  node: SchemaNode;
  nullable: boolean;
}

export interface JavaSemanticResult {
  document: SchemaDocument;
  semanticNotes: SchemaSemanticNote[];
}

const primitiveRepresentations: Record<string, ScalarRepresentationHint> = {
  byte: { family: "integer", signedness: "signed", widthBits: 8 },
  short: { family: "integer", signedness: "signed", widthBits: 16 },
  int: { family: "integer", signedness: "signed", widthBits: 32 },
  long: { family: "integer", signedness: "signed", widthBits: 64 },
  float: { family: "float", widthBits: 32 },
  double: { family: "float", widthBits: 64 },
};

const boxed = new Map([
  ["Byte", "byte"],
  ["Short", "short"],
  ["Integer", "int"],
  ["Long", "long"],
  ["Float", "float"],
  ["Double", "double"],
  ["Boolean", "boolean"],
]);

export function mapJavaFile(
  file: JavaFileSyntax,
  name: string,
  entry?: string,
): JavaSemanticResult {
  if (!file.declarations.length)
    throw new JavaSemanticError(
      "invalid-java-data-model",
      "Java source must declare at least one record, class, or enum.",
    );
  const names = new Set<string>();
  for (const declaration of file.declarations) {
    if (names.has(declaration.name))
      throw new JavaSemanticError(
        "duplicate-java-definition",
        `Duplicate Java definition "${declaration.name}".`,
        declaration.position,
      );
    names.add(declaration.name);
  }
  const publicDeclarations = file.declarations.filter(
    (declaration) => declaration.public,
  );
  if (publicDeclarations.length > 1)
    throw new JavaSemanticError(
      "multiple-java-public-roots",
      "Java source must contain exactly one public root declaration.",
      publicDeclarations[1]?.position,
    );
  const publicRoot = publicDeclarations[0];
  if (!publicRoot)
    throw new JavaSemanticError(
      "missing-java-public-root",
      "Java source must contain one public root record, class, or enum.",
    );
  if (entry && entry !== publicRoot.name)
    throw new JavaSemanticError(
      "invalid-java-entry",
      `Java entry "${entry}" must name the public root declaration "${publicRoot.name}".`,
      publicRoot.position,
    );

  const notes: SchemaSemanticNote[] = [];
  const mapped = new Map<string, SchemaNode>();
  for (const declaration of file.declarations)
    mapped.set(declaration.name, mapDeclaration(declaration, names, notes));
  const rootNode = mapped.get(publicRoot.name)!;
  const rootReferenced = file.declarations.some((declaration) =>
    references(mapped.get(declaration.name)!, publicRoot.name),
  );
  for (const declaration of file.declarations) {
    if (declaration.kind === "enum" || declaration.kind === "class")
      notes.push({
        kind: "normalization",
        code:
          declaration.kind === "enum"
            ? "java-enum-lowered"
            : "java-class-lowered",
        message:
          declaration.kind === "enum"
            ? "Java enum identity was lowered to a shared string literal union."
            : "Java class behavior was lowered to a structural object shape.",
        path:
          declaration === publicRoot && !rootReferenced
            ? ["root"]
            : ["definitions", declaration.name],
        source: "parser-java",
        layer: "shape",
      });
  }
  const definitions = file.declarations
    .filter((declaration) => declaration !== publicRoot || rootReferenced)
    .map((declaration) =>
      schemaDefinition(declaration.name, mapped.get(declaration.name)!),
    );
  return {
    document: schemaDocument(
      name,
      rootReferenced ? schemaReferenceNode(publicRoot.name) : rootNode,
      {
        rootName: publicRoot.name,
        definitions,
      },
    ),
    semanticNotes: notes,
  };
}

function mapDeclaration(
  declaration: JavaDeclarationSyntax,
  names: Set<string>,
  notes: SchemaSemanticNote[],
): SchemaNode {
  if (declaration.kind === "enum") {
    return schemaUnionNode(
      declaration.variants.map((variant) => schemaLiteralNode(variant)),
    );
  }
  if (declaration.kind === "class")
    return schemaObjectNode(
      declaration.fields.map((field) => {
        const mapped = mapType(field.type, names, notes, [
          "definitions",
          declaration.name,
          field.name,
        ]);
        return schemaFieldNode(field.name, mapped.node, {
          required: true,
          nullable: mapped.nullable,
        });
      }),
    );
  return mapRecord(declaration, names, notes);
}

function mapRecord(
  record: Extract<JavaDeclarationSyntax, { kind: "record" }>,
  names: Set<string>,
  notes: SchemaSemanticNote[],
): SchemaNode {
  return schemaObjectNode(
    record.components.map((component) => {
      const mapped = mapType(component.type, names, notes, [
        "definitions",
        record.name,
        component.name,
      ]);
      return schemaFieldNode(component.name, mapped.node, {
        required: true,
        nullable: mapped.nullable,
      });
    }),
  );
}

function mapType(
  type: JavaTypeSyntax,
  names: Set<string>,
  notes: SchemaSemanticNote[],
  path: string[],
): MappedType {
  if (type.kind === "array") {
    const element = mapType(type.element!, names, notes, [...path, "items"]);
    return { node: schemaArrayNode(nullableNested(element)), nullable: true };
  }
  if (type.kind === "generic") {
    const base = simpleName(type.name!);
    const args = type.arguments ?? [];
    if (base === "List") {
      if (args.length !== 1)
        throw new JavaSemanticError(
          "unsupported-java-generic",
          "List requires exactly one type argument.",
          type.position,
        );
      rejectPrimitiveGenericArgument(args[0]!);
      const element = mapType(args[0]!, names, notes, [...path, "items"]);
      return { node: schemaArrayNode(nullableNested(element)), nullable: true };
    }
    if (base === "Map") {
      if (args.length !== 2)
        throw new JavaSemanticError(
          "unsupported-java-generic",
          "Map requires exactly two type arguments.",
          type.position,
        );
      const key = args[0]!;
      if (key.kind !== "name" || simpleName(key.name!) !== "String")
        throw new JavaSemanticError(
          "unsupported-java-map-key",
          "Only Map<String, T> is representable as a schema record.",
          key.position,
        );
      rejectPrimitiveGenericArgument(args[1]!);
      const value = mapType(args[1]!, names, notes, [...path, "value"]);
      return {
        node: schemaRecordNode(
          schemaScalarNode("string"),
          nullableNested(value),
        ),
        nullable: true,
      };
    }
    throw new JavaSemanticError(
      "unsupported-java-generic",
      `Java generic type "${type.name}" is not supported in V1.`,
      type.position,
    );
  }
  const name = simpleName(type.name!);
  if (name === "boolean")
    return { node: schemaScalarNode("boolean"), nullable: false };
  if (primitiveRepresentations[name]) {
    const scalar = name === "float" || name === "double" ? "number" : "integer";
    return {
      node: schemaScalarNode(scalar, {
        representation: primitiveRepresentations[name],
      }),
      nullable: false,
    };
  }
  if (name === "String") return nullableScalar("string", notes, path);
  const primitiveBox = boxed.get(name);
  if (primitiveBox) {
    if (primitiveBox === "boolean")
      return nullableScalar("boolean", notes, path);
    const scalar =
      primitiveBox === "float" || primitiveBox === "double"
        ? "number"
        : "integer";
    return nullableScalar(
      scalar,
      notes,
      path,
      primitiveRepresentations[primitiveBox],
    );
  }
  if (names.has(name)) {
    notes.push(nullabilityNote(path));
    return { node: schemaReferenceNode(name), nullable: true };
  }
  throw new JavaSemanticError(
    "unknown-java-reference",
    `Java type "${type.name}" is not a known record or supported scalar.`,
    type.position,
  );
}

function rejectPrimitiveGenericArgument(type: JavaTypeSyntax): void {
  if (
    type.kind === "name" &&
    (simpleName(type.name!) === "boolean" ||
      primitiveRepresentations[simpleName(type.name!)] !== undefined)
  )
    throw new JavaSemanticError(
      "unsupported-java-generic",
      "Java generic type arguments cannot use primitive types.",
      type.position,
    );
}

function nullableScalar(
  scalar: "string" | "integer" | "number" | "boolean",
  notes: SchemaSemanticNote[],
  path: string[],
  representation?: ScalarRepresentationHint,
): MappedType {
  notes.push(nullabilityNote(path));
  return {
    node: schemaScalarNode(
      scalar,
      representation ? { representation } : undefined,
    ),
    nullable: true,
  };
}

function nullableNested(mapped: MappedType): SchemaNode {
  return mapped.nullable
    ? schemaUnionNode([mapped.node, schemaNullNode()])
    : mapped.node;
}

function nullabilityNote(path: string[]): SchemaSemanticNote {
  return {
    kind: "widening",
    code: "java-nullability-unspecified",
    message:
      "Java reference-type nullability is unspecified by the type declaration and was conservatively represented as nullable.",
    path,
    source: "parser-java",
    layer: "shape",
  };
}

function simpleName(name: string): string {
  return name.split(".").at(-1)!;
}

function references(node: SchemaNode, target: string): boolean {
  if (node.kind === "reference") return node.name === target;
  if (node.kind === "array") return references(node.elementType, target);
  if (node.kind === "record")
    return references(node.key, target) || references(node.value, target);
  if (node.kind === "union")
    return node.members.some((member) => references(member, target));
  if (node.kind === "object")
    return node.fields.some((field) => references(field.type, target));
  return false;
}
