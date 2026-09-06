import {
  constraint,
  constraintDocument,
  constraintEntry,
  constraintTarget,
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
  type ConstraintDocument,
  type SchemaDocument,
  type SchemaNode,
  type SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import { KotlinSemanticError } from "./failure.js";
import type { KotlinDeclarationSyntax, KotlinTypeSyntax } from "./syntax.js";

export interface KotlinSemanticResult {
  document: SchemaDocument;
  constraints: ConstraintDocument;
  semanticNotes: SchemaSemanticNote[];
}
interface MappedType {
  node: SchemaNode;
  nullable: boolean;
}
type KotlinRepresentation =
  | { family: "integer"; signedness: "signed"; widthBits: 8 | 16 | 32 | 64 }
  | { family: "float"; widthBits: 32 | 64 };

const scalarTypes: Record<
  string,
  {
    scalar: "string" | "integer" | "number" | "boolean";
    representation?: KotlinRepresentation;
  }
> = {
  String: { scalar: "string" },
  Boolean: { scalar: "boolean" },
  Byte: {
    scalar: "integer",
    representation: { family: "integer", signedness: "signed", widthBits: 8 },
  },
  Short: {
    scalar: "integer",
    representation: { family: "integer", signedness: "signed", widthBits: 16 },
  },
  Int: {
    scalar: "integer",
    representation: { family: "integer", signedness: "signed", widthBits: 32 },
  },
  Long: {
    scalar: "integer",
    representation: { family: "integer", signedness: "signed", widthBits: 64 },
  },
  Float: {
    scalar: "number",
    representation: { family: "float", widthBits: 32 },
  },
  Double: {
    scalar: "number",
    representation: { family: "float", widthBits: 64 },
  },
};

export function mapKotlinFile(
  declarations: KotlinDeclarationSyntax[],
  name: string,
  entry?: string,
): KotlinSemanticResult {
  if (!declarations.length)
    throw new KotlinSemanticError(
      "malformed-kotlin-model",
      "Kotlin source must declare at least one supported data class or enum.",
    );
  const names = new Set<string>();
  for (const declaration of declarations) {
    if (names.has(declaration.name))
      throw new KotlinSemanticError(
        "duplicate-kotlin-definition",
        `Duplicate Kotlin definition "${declaration.name}".`,
        declaration.position,
      );
    names.add(declaration.name);
  }
  const rootName = selectRoot(declarations, names, entry);
  const rootReferenced = declarations.some(
    (declaration) =>
      declaration.name !== rootName &&
      declarationReferencesName(declaration, rootName),
  );
  const rootSelfReferenced = declarations.some(
    (declaration) =>
      declaration.name === rootName &&
      declarationReferencesName(declaration, rootName),
  );
  const rootNeedsDefinition = rootReferenced || rootSelfReferenced;
  const constraints = [] as ReturnType<typeof constraintEntry>[];
  const notes: SchemaSemanticNote[] = [];
  const mapped = new Map<string, SchemaNode>();
  for (const declaration of declarations) {
    const basePath =
      declaration.name === rootName && !rootReferenced && !rootSelfReferenced
        ? ["root"]
        : ["definitions", declaration.name];
    mapped.set(
      declaration.name,
      mapDeclaration(declaration, names, constraints, notes, basePath),
    );
  }
  const rootNode = mapped.get(rootName)!;
  const definitions = declarations
    .filter(
      (declaration) => declaration.name !== rootName || rootNeedsDefinition,
    )
    .map((declaration) =>
      schemaDefinition(declaration.name, mapped.get(declaration.name)!),
    );
  return {
    document: schemaDocument(
      name,
      rootNeedsDefinition ? schemaReferenceNode(rootName) : rootNode,
      { rootName, definitions },
    ),
    constraints: constraintDocument(name, constraints),
    semanticNotes: notes,
  };
}

function selectRoot(
  declarations: KotlinDeclarationSyntax[],
  names: Set<string>,
  entry?: string,
): string {
  if (entry !== undefined) {
    if (!names.has(entry))
      throw new KotlinSemanticError(
        "invalid-kotlin-entry",
        `Kotlin entry "${entry}" does not name a declaration.`,
      );
    return entry;
  }
  if (declarations.length === 1) return declarations[0]!.name;
  const referenced = new Set<string>();
  for (const declaration of declarations) {
    if (declaration.kind !== "data-class") continue;
    for (const property of declaration.properties)
      collectReferences(property.type, names, referenced, declaration.name);
  }
  const roots = declarations
    .map((declaration) => declaration.name)
    .filter((name) => !referenced.has(name));
  if (roots.length !== 1)
    throw new KotlinSemanticError(
      "ambiguous-kotlin-root",
      "Kotlin source must have exactly one root declaration or provide the entry option.",
    );
  return roots[0]!;
}

function collectReferences(
  type: KotlinTypeSyntax,
  names: Set<string>,
  referenced: Set<string>,
  owner: string,
): void {
  if (names.has(type.name) && type.name !== owner) referenced.add(type.name);
  for (const argument of type.arguments ?? [])
    collectReferences(argument, names, referenced, owner);
}

function declarationReferencesName(
  declaration: KotlinDeclarationSyntax,
  target: string,
): boolean {
  return (
    declaration.kind === "data-class" &&
    declaration.properties.some((property) =>
      typeReferencesName(property.type, target),
    )
  );
}
function typeReferencesName(type: KotlinTypeSyntax, target: string): boolean {
  return (
    type.name === target ||
    (type.arguments ?? []).some((argument) =>
      typeReferencesName(argument, target),
    )
  );
}

function mapDeclaration(
  declaration: KotlinDeclarationSyntax,
  names: Set<string>,
  constraints: ReturnType<typeof constraintEntry>[],
  notes: SchemaSemanticNote[],
  basePath: string[],
): SchemaNode {
  if (declaration.kind === "enum")
    return schemaUnionNode(
      declaration.members.map((member) => schemaLiteralNode(member)),
    );
  return schemaObjectNode(
    declaration.properties.map((property, index) => {
      if (
        declaration.properties
          .slice(0, index)
          .some((previous) => previous.name === property.name)
      )
        throw new KotlinSemanticError(
          "duplicate-kotlin-field",
          `Duplicate Kotlin field "${property.name}".`,
          property.position,
        );
      const mapped = mapType(
        property.type,
        names,
        constraints,
        [...basePath, property.name],
        notes,
      );
      return schemaFieldNode(property.name, mapped.node, {
        required: true,
        nullable: mapped.nullable,
      });
    }),
  );
}

function mapType(
  type: KotlinTypeSyntax,
  names: Set<string>,
  constraints: ReturnType<typeof constraintEntry>[],
  path: string[],
  notes: SchemaSemanticNote[],
): MappedType {
  let mapped: MappedType;
  const args = type.arguments ?? [];
  if (type.name === "List" || type.name === "Set") {
    if (args.length !== 1)
      throw new KotlinSemanticError(
        "unsupported-kotlin-generic",
        `${type.name}<T> requires exactly one type argument.`,
        type.position,
      );
    const element = mapType(
      args[0]!,
      names,
      constraints,
      [...path, "items"],
      notes,
    );
    mapped = {
      node: schemaArrayNode(nullableNested(element)),
      nullable: false,
    };
    if (type.name === "Set") {
      constraints.push(
        constraintEntry(constraintTarget("node", path), [
          constraint("unique-items", {
            value: true,
            message:
              "Kotlin Set uniqueness is represented as a collection constraint.",
            evidence: { source: "kotlin", collection: "Set" },
          }),
        ]),
      );
      notes.push({
        kind: "normalization",
        code: "kotlin-set-lowered-to-array",
        message:
          "Kotlin Set was lowered to an array with a unique-items constraint.",
        path,
        source: "parser-kotlin",
        layer: "constraint",
      });
    }
  } else if (type.name === "Map") {
    if (args.length !== 2)
      throw new KotlinSemanticError(
        "unsupported-kotlin-generic",
        "Map<K, V> requires exactly two type arguments.",
        type.position,
      );
    const key = args[0]!;
    if (
      key.name !== "String" ||
      key.nullable ||
      (key.arguments?.length ?? 0) > 0
    )
      throw new KotlinSemanticError(
        "unsupported-kotlin-map-key",
        "Only Map<String, T> is representable as a schema record.",
        key.position,
      );
    const value = mapType(
      args[1]!,
      names,
      constraints,
      [...path, "value"],
      notes,
    );
    mapped = {
      node: schemaRecordNode(schemaScalarNode("string"), nullableNested(value)),
      nullable: false,
    };
  } else if (scalarTypes[type.name]) {
    if (args.length)
      throw new KotlinSemanticError(
        "unsupported-kotlin-generic",
        `Kotlin scalar type "${type.name}" cannot have type arguments.`,
        type.position,
      );
    const scalar = scalarTypes[type.name]!;
    mapped = {
      node: schemaScalarNode(
        scalar.scalar,
        scalar.representation
          ? { representation: scalar.representation }
          : undefined,
      ),
      nullable: false,
    };
  } else if (names.has(type.name)) {
    if (args.length)
      throw new KotlinSemanticError(
        "unsupported-kotlin-generic",
        `Kotlin declaration reference "${type.name}" cannot have type arguments in V1.`,
        type.position,
      );
    mapped = { node: schemaReferenceNode(type.name), nullable: false };
  } else {
    if (args.length)
      throw new KotlinSemanticError(
        "unsupported-kotlin-generic",
        `Kotlin generic type "${type.name}" is not supported in V1.`,
        type.position,
      );
    throw new KotlinSemanticError(
      "unresolved-kotlin-reference",
      `Kotlin type "${type.name}" is not a supported scalar or known declaration.`,
      type.position,
    );
  }
  return type.nullable ? { node: mapped.node, nullable: true } : mapped;
}

function nullableNested(mapped: MappedType): SchemaNode {
  return mapped.nullable
    ? schemaUnionNode([mapped.node, schemaNullNode()])
    : mapped.node;
}
