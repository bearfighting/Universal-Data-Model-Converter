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
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
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
  RustEnumSyntax,
  RustFileSyntax,
  RustItemSyntax,
  RustStructSyntax,
  RustTypeSyntax,
} from "./syntax.js";
import type { RustPosition } from "./lexer.js";

export type RustSemanticErrorCode =
  | "ambiguous-rust-entry"
  | "missing-rust-entry"
  | "duplicate-rust-definition"
  | "invalid-rust-data-model"
  | "unsupported-rust-map-key"
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
  node: SchemaNode;
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
  for (const item of file.items) {
    if (names.has(item.name))
      throw new RustSemanticError(
        "duplicate-rust-definition",
        `Duplicate Rust definition "${item.name}".`,
        item.position,
      );
    names.add(item.name);
  }
  if (file.items.length === 0)
    throw new RustSemanticError(
      "invalid-rust-data-model",
      "Rust source must declare at least one struct or enum.",
    );

  const root = entryName
    ? file.items.find((item) => item.name === entryName)
    : file.items.length === 1
      ? file.items[0]
      : undefined;
  if (!root) {
    throw new RustSemanticError(
      entryName ? "missing-rust-entry" : "ambiguous-rust-entry",
      entryName
        ? `Rust entry definition "${entryName}" was not found.`
        : "Rust source has multiple definitions; an entry option is required.",
    );
  }

  const mappedItems = file.items.map((item) => ({
    item,
    mapped: mapItem(item, item === root, names),
  }));
  const mappedRoot = mappedItems.find((item) => item.item === root)!.mapped;
  const rootIsReferenced = file.items.some((candidate) =>
    referencesName(candidate, root.name),
  );
  const definitions = mappedItems
    .filter(
      (item) =>
        item.item !== root ||
        file.items.some((candidate) => referencesName(candidate, root.name)),
    )
    .map((item) => schemaDefinition(item.item.name, item.mapped.node));
  const entries: ConstraintEntry[] = mappedItems.flatMap(
    (item) => item.mapped.constraints ?? [],
  );
  const notes = mappedItems.flatMap((item) => item.mapped.notes ?? []);

  return {
    document: schemaDocument(
      name,
      rootIsReferenced ? schemaReferenceNode(root.name) : mappedRoot.node,
      {
        rootName: root.name,
        definitions,
      },
    ),
    constraints: constraintDocument(name, entries),
    semanticNotes: notes,
  };
}

function mapItem(
  item: RustItemSyntax,
  root: boolean,
  names: Set<string>,
): MappedStruct {
  return item.kind === "struct" ? mapStruct(item, root, names) : mapEnum(item);
}

function mapEnum(enumSyntax: RustEnumSyntax): MappedStruct {
  if (enumSyntax.variants.length === 0)
    throw new RustSemanticError(
      "invalid-rust-data-model",
      `Rust enum "${enumSyntax.name}" must declare at least one unit variant.`,
      enumSyntax.position,
    );
  const variants = new Set<string>();
  for (const variant of enumSyntax.variants) {
    if (variants.has(variant.name))
      throw new RustSemanticError(
        "invalid-rust-data-model",
        `Rust enum "${enumSyntax.name}" declares duplicate variant "${variant.name}".`,
        variant.position,
      );
    variants.add(variant.name);
  }
  return {
    node: schemaUnionNode(
      enumSyntax.variants.map((variant) => schemaLiteralNode(variant.name)),
    ),
    constraints: [],
    notes: [],
  };
}

function referencesName(item: RustItemSyntax, name: string): boolean {
  if (item.kind !== "struct") return false;
  return item.fields.some((field) => typeReferencesName(field.type, name));
}

function typeReferencesName(type: RustTypeSyntax, name: string): boolean {
  if (type.kind === "named")
    return type.path.length === 1 && type.path[0] === name;
  if (type.kind === "reference") return false;
  return (type.arguments ?? (type.inner ? [type.inner] : [])).some((argument) =>
    typeReferencesName(argument, name),
  );
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
    const arguments_ = type.arguments ?? (type.inner ? [type.inner] : []);
    if (arguments_.length === 0)
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
      if (arguments_.length !== 1)
        throw new RustSemanticError(
          "invalid-rust-data-model",
          `Rust generic type "${name}" expects one type argument.`,
          type.position,
        );
      const inner = mapType(arguments_[0]!, names, true, constraintPath);
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
      if (arguments_.length !== 1)
        throw new RustSemanticError(
          "invalid-rust-data-model",
          `Rust generic type "${name}" expects one type argument.`,
          type.position,
        );
      const inner = mapType(arguments_[0]!, names, true, [
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
    if (
      isKnownPath(path, [
        "HashMap",
        "std::collections::HashMap",
        "alloc::collections::HashMap",
        "BTreeMap",
        "std::collections::BTreeMap",
        "alloc::collections::BTreeMap",
      ])
    ) {
      if (arguments_.length !== 2)
        throw new RustSemanticError(
          "invalid-rust-data-model",
          `Rust map type "${name}" expects a key and value type.`,
          type.position,
        );
      const key = arguments_[0]!;
      const keyPath = key.path.join("::");
      if (
        key.kind !== "named" ||
        ![
          "String",
          "std::string::String",
          "alloc::string::String",
          "str",
        ].includes(keyPath)
      )
        throw new RustSemanticError(
          "unsupported-rust-map-key",
          "Rust map keys must currently resolve to String-compatible types.",
          key.position,
        );
      const value = mapType(arguments_[1]!, names, true, [
        ...constraintPath,
        "value",
      ]);
      return {
        node: schemaRecordNode(schemaScalarNode("string"), value.node),
        ...(value.constraints ? { constraints: value.constraints } : {}),
        ...(value.notes ? { notes: value.notes } : {}),
        ...(value.constraintPath
          ? { constraintPath: value.constraintPath }
          : {}),
        ...(value.notePath ? { notePath: value.notePath } : {}),
      };
    }
    if (isKnownPath(path, ["Box", "alloc::boxed::Box", "std::boxed::Box"])) {
      if (arguments_.length !== 1)
        throw new RustSemanticError(
          "invalid-rust-data-model",
          `Rust wrapper "${name}" expects one type argument.`,
          type.position,
        );
      return mapType(arguments_[0]!, names, nested, constraintPath);
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
