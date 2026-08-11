import {
  constraintDocument,
  constraintEntry,
  constraintTarget,
  decimalValue,
  numericConstraint,
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  type ConstraintEntry,
  type NumericConstraint,
  type SchemaDocument,
  type SchemaNode,
  type SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import type {
  RustFileSyntax,
  RustStructSyntax,
  RustTypeSyntax,
} from "./syntax.js";
import type { RustPosition } from "./lexer.js";

export type RustSemanticErrorCode =
  | "ambiguous-rust-entry"
  | "missing-rust-entry"
  | "duplicate-rust-definition"
  | "invalid-rust-data-model"
  | "unsupported-rust-type";

export class RustSemanticError extends Error {
  constructor(
    readonly code: RustSemanticErrorCode,
    message: string,
    readonly position?: RustPosition,
  ) {
    super(message);
    this.name = "RustSemanticError";
  }
}

export interface RustSemanticResult {
  document: SchemaDocument;
  constraints: ReturnType<typeof constraintDocument>;
  semanticNotes: SchemaSemanticNote[];
}

interface MappedType {
  node: SchemaNode;
  optional?: boolean;
  nullable?: boolean;
  constraints?: NumericConstraint[];
  notes?: SchemaSemanticNote[];
  constraintPath?: string[];
  notePath?: string[];
}

interface MappedStruct {
  node: Extract<SchemaNode, { kind: "object" }>;
  constraints: ConstraintEntry[];
  notes: SchemaSemanticNote[];
}

const INTEGER_BOUNDS: Record<
  string,
  {
    min: string;
    max: string;
    signedness: "signed" | "unsigned";
    widthBits: 8 | 16 | 32 | 64 | 128;
  }
> = {
  i8: { min: "-128", max: "127", signedness: "signed", widthBits: 8 },
  i16: { min: "-32768", max: "32767", signedness: "signed", widthBits: 16 },
  i32: {
    min: "-2147483648",
    max: "2147483647",
    signedness: "signed",
    widthBits: 32,
  },
  i64: {
    min: "-9223372036854775808",
    max: "9223372036854775807",
    signedness: "signed",
    widthBits: 64,
  },
  i128: {
    min: "-170141183460469231731687303715884105728",
    max: "170141183460469231731687303715884105727",
    signedness: "signed",
    widthBits: 128,
  },
  u8: { min: "0", max: "255", signedness: "unsigned", widthBits: 8 },
  u16: { min: "0", max: "65535", signedness: "unsigned", widthBits: 16 },
  u32: { min: "0", max: "4294967295", signedness: "unsigned", widthBits: 32 },
  u64: {
    min: "0",
    max: "18446744073709551615",
    signedness: "unsigned",
    widthBits: 64,
  },
  u128: {
    min: "0",
    max: "340282366920938463463374607431768211455",
    signedness: "unsigned",
    widthBits: 128,
  },
};

export function mapRustFile(
  file: RustFileSyntax,
  name: string,
  entryName?: string,
): RustSemanticResult {
  const names = new Set<string>();
  for (const structure of file.structs) {
    if (names.has(structure.name))
      throw new RustSemanticError(
        "duplicate-rust-definition",
        `Duplicate Rust struct definition "${structure.name}".`,
        structure.position,
      );
    names.add(structure.name);
  }
  if (file.structs.length === 0)
    throw new RustSemanticError(
      "invalid-rust-data-model",
      "Rust source must declare at least one struct.",
    );

  const root = entryName
    ? file.structs.find((structure) => structure.name === entryName)
    : file.structs.length === 1
      ? file.structs[0]
      : undefined;
  if (!root) {
    throw new RustSemanticError(
      entryName ? "missing-rust-entry" : "ambiguous-rust-entry",
      entryName
        ? `Rust entry struct "${entryName}" was not found.`
        : "Rust source has multiple structs; an entry option is required.",
    );
  }

  const mappedStructs = file.structs.map((structure) => ({
    structure,
    mapped: mapStruct(structure, structure === root, names),
  }));
  const mappedRoot = mappedStructs.find(
    (item) => item.structure === root,
  )!.mapped;
  const definitions = mappedStructs
    .filter((item) => item.structure !== root)
    .map((item) => schemaDefinition(item.structure.name, item.mapped.node));
  const entries: ConstraintEntry[] = mappedStructs.flatMap(
    (item) => item.mapped.constraints ?? [],
  );
  const notes = mappedStructs.flatMap((item) => item.mapped.notes ?? []);

  return {
    document: schemaDocument(name, mappedRoot.node, { definitions }),
    constraints: constraintDocument(name, entries),
    semanticNotes: notes,
  };
}

function mapStruct(
  structure: RustStructSyntax,
  root: boolean,
  names: Set<string>,
): MappedStruct {
  const constraints: ConstraintEntry[] = [];
  const notes: SchemaSemanticNote[] = [];
  const fields = structure.fields.map((field) => {
    const path = root
      ? ["root", field.name]
      : ["definitions", structure.name, field.name];
    const mapped = mapType(field.type, names, false, path);
    if (mapped.constraints?.length) {
      constraints.push(
        constraintEntry(
          constraintTarget("node", mapped.constraintPath ?? path),
          mapped.constraints,
        ),
      );
    }
    if (mapped.notes?.length)
      notes.push(
        ...mapped.notes.map((note) => ({
          ...note,
          path: mapped.notePath ?? mapped.constraintPath ?? path,
        })),
      );
    return schemaFieldNode(field.name, mapped.node, {
      required: !mapped.optional,
      nullable: mapped.nullable ?? false,
    });
  });
  return { node: schemaObjectNode(fields), constraints, notes };
}

function mapType(
  type: RustTypeSyntax,
  names: Set<string>,
  nested: boolean,
  constraintPath: string[],
): MappedType {
  const path = type.path.join("::");
  if (type.kind === "reference") return { node: schemaScalarNode("string") };
  if (type.kind === "generic") {
    const name = path;
    if (!type.inner)
      throw new RustSemanticError(
        "invalid-rust-data-model",
        `Rust generic type "${name}" is missing its inner type.`,
        type.position,
      );
    if (
      isKnownPath(path, [
        "Option",
        "std::option::Option",
        "core::option::Option",
      ])
    ) {
      const inner = mapType(type.inner, names, true, constraintPath);
      return nested
        ? {
            node: schemaUnionNode([inner.node, schemaNullNode()]),
            ...(inner.constraints ? { constraints: inner.constraints } : {}),
            ...(inner.notes ? { notes: inner.notes } : {}),
            ...(inner.constraintPath
              ? { constraintPath: inner.constraintPath }
              : {}),
            ...(inner.notePath ? { notePath: inner.notePath } : {}),
          }
        : { ...inner, optional: true, nullable: true };
    }
    if (isKnownPath(path, ["Vec", "std::vec::Vec", "alloc::vec::Vec"])) {
      const inner = mapType(type.inner, names, true, [
        ...constraintPath,
        "items",
      ]);
      return {
        node: schemaArrayNode(inner.node),
        ...(inner.constraints ? { constraints: inner.constraints } : {}),
        ...(inner.notes ? { notes: inner.notes } : {}),
        ...(inner.constraintPath
          ? { constraintPath: inner.constraintPath }
          : {}),
        ...(inner.notePath ? { notePath: inner.notePath } : {}),
      };
    }
    throw new RustSemanticError(
      "unsupported-rust-type",
      `Rust generic type "${name}" is not supported in V1.`,
      type.position,
    );
  }
  if (path === "bool") return { node: schemaScalarNode("boolean") };
  if (
    ["String", "str", "std::string::String", "alloc::string::String"].includes(
      path,
    )
  )
    return { node: schemaScalarNode("string") };
  const integer = INTEGER_BOUNDS[path];
  if (integer) {
    return {
      node: schemaScalarNode("integer", {
        representation: {
          family: "integer",
          signedness: integer.signedness,
          widthBits: integer.widthBits,
        },
      }),
      constraints: [
        numericConstraint("minimum", integerConstraintValue(integer.min)),
        numericConstraint("maximum", integerConstraintValue(integer.max)),
      ],
      constraintPath,
    };
  }
  if (path === "isize" || path === "usize") {
    const signedness = path === "isize" ? "signed" : "unsigned";
    return {
      node: schemaScalarNode("integer", {
        representation: { family: "integer", signedness, widthBits: "pointer" },
      }),
      ...(path === "usize"
        ? { constraints: [numericConstraint("minimum", 0)] }
        : {}),
      notes: [
        {
          kind: "policy",
          code: "rust-platform-integer",
          message: `${path} has platform-dependent numeric bounds.`,
          layer: "constraint",
          source: "parser-rust",
        },
      ],
      constraintPath,
      notePath: constraintPath,
    };
  }
  if (path === "f32" || path === "f64")
    return {
      node: schemaScalarNode("number", {
        representation: {
          family: "float",
          widthBits: path === "f32" ? 32 : 64,
        },
      }),
    };
  if (type.path.length > 1)
    throw new RustSemanticError(
      "unsupported-rust-type",
      `Rust type path "${path}" is not supported in V1.`,
      type.position,
    );
  if (!names.has(path))
    throw new RustSemanticError(
      "invalid-rust-data-model",
      `Rust type reference "${path}" does not match a struct definition.`,
      type.position,
    );
  return { node: schemaReferenceNode(path) };
}

function integerConstraintValue(
  value: string,
): number | ReturnType<typeof decimalValue> {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : decimalValue(value);
}

function isKnownPath(path: string, candidates: string[]): boolean {
  return candidates.includes(path);
}
