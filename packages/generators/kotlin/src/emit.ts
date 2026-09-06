import type {
  ConstraintDocument,
  SchemaDocument,
  SchemaFieldNode,
  SchemaNode,
} from "@schema-transformation-toolkit/core";
import { KotlinGenerationError } from "./failure.js";
import {
  KOTLIN_KEYWORDS,
  kotlinIdentifier,
  type ResolvedKotlinGeneratorOptions,
} from "./options.js";

interface Context {
  options: ResolvedKotlinGeneratorOptions;
  constraints?: ConstraintDocument;
  declarations: string[];
  declared: Set<string>;
  losses: Array<{ code: string; message: string; path?: string[] }>;
}
export interface KotlinRenderResult {
  output: string;
  losses: Context["losses"];
}

export function renderKotlinDocument(
  document: SchemaDocument,
  options: ResolvedKotlinGeneratorOptions,
  constraints?: ConstraintDocument,
): KotlinRenderResult {
  const context: Context = {
    options,
    ...(constraints ? { constraints } : {}),
    declarations: [],
    declared: new Set(),
    losses: [],
  };
  const rootName =
    document.root.kind === "reference"
      ? document.root.name
      : (document.rootName?.source ?? document.name.source);
  const rootDefinition =
    document.root.kind === "reference"
      ? document.definitions.find(
          (definition) => definition.name.source === rootName,
        )
      : undefined;
  const rootNode = rootDefinition?.type ?? document.root;
  if (rootNode.kind !== "object" && !isEnumUnion(rootNode))
    throw new KotlinGenerationError(
      "unsupported-kotlin-root",
      "Kotlin generator requires an object root or a string literal union enum root.",
    );
  emitDeclaration(
    rootName,
    rootNode,
    true,
    document.root.kind === "reference" ? ["definitions", rootName] : ["root"],
    context,
  );
  for (const definition of document.definitions)
    if (definition.name.source !== rootName)
      emitDeclaration(
        definition.name.source,
        definition.type,
        false,
        ["definitions", definition.name.source],
        context,
      );
  const prefix = options.packageName
    ? `package ${options.packageName}\n\n`
    : "";
  return {
    output: `${prefix}${context.declarations.join("\n\n")}\n`,
    losses: context.losses,
  };
}

function emitDeclaration(
  name: string,
  node: SchemaNode,
  root: boolean,
  path: string[],
  context: Context,
): void {
  if (isEnumUnion(node)) {
    emitEnum(name, node, root, path, context);
    return;
  }
  if (node.kind !== "object")
    throw new KotlinGenerationError(
      "unsupported-kotlin-node",
      `Kotlin definition "${name}" must be an object or string literal union.`,
    );
  if (
    context.options.declarationStyle === "data-class" &&
    node.fields.length === 0
  )
    throw new KotlinGenerationError(
      "unsupported-kotlin-empty-object",
      `Kotlin data class "${name}" must declare at least one property.`,
    );
  if (node.additionalProperties)
    throw new KotlinGenerationError(
      "unsupported-kotlin-additional-properties",
      `Kotlin V1 cannot generate additional properties for "${name}".`,
    );
  const identifier = kotlinDeclarationIdentifier(name);
  if (context.declared.has(identifier))
    throw new KotlinGenerationError(
      "duplicate-kotlin-definition",
      `Kotlin definition "${name}" was emitted more than once.`,
    );
  context.declared.add(identifier);
  const optionalField = node.fields.find((field) => !field.required);
  if (optionalField)
    throw new KotlinGenerationError(
      "unsupported-kotlin-optional-field",
      `Kotlin V1 cannot represent optional field presence for "${optionalField.name.source}" without a default value.`,
    );
  const fields = node.fields.map((field) =>
    renderField(field, [...path, field.name.source], context),
  );
  const keyword =
    context.options.declarationStyle === "data-class" ? "data class" : "class";
  const body = fields
    .map(
      (field) =>
        `    ${context.options.propertyStyle} ${field.name}: ${field.type}`,
    )
    .join(",\n");
  context.declarations.push(
    `${keyword} ${identifier}(\n${body}${body ? "," : ""}\n)`,
  );
  void root;
}

function emitEnum(
  name: string,
  node: Extract<SchemaNode, { kind: "union" }>,
  root: boolean,
  path: string[],
  context: Context,
): void {
  const identifier = kotlinDeclarationIdentifier(name);
  if (context.declared.has(identifier))
    throw new KotlinGenerationError(
      "duplicate-kotlin-definition",
      `Kotlin definition "${name}" was emitted more than once.`,
    );
  context.declared.add(identifier);
  const used = new Set<string>();
  const variants = node.members.map((member, index) => {
    if (member.kind !== "literal" || typeof member.value !== "string")
      throw new KotlinGenerationError(
        "unsupported-kotlin-enum",
        `Kotlin enum "${name}" requires string literal variants.`,
      );
    const raw = member.value;
    let variant = enumIdentifier(raw);
    if (used.has(variant))
      throw new KotlinGenerationError(
        "kotlin-enum-name-collision",
        `Kotlin enum member values "${raw}" collide after identifier normalization.`,
      );
    used.add(variant);
    if (variant !== raw && !KOTLIN_KEYWORDS.has(raw))
      context.losses.push({
        code: "kotlin-enum-member-renamed",
        message: `Kotlin enum member "${raw}" was normalized to "${variant}".`,
        path: [...path, "members", String(index)],
      });
    return `    ${variant}`;
  });
  context.declarations.push(
    `enum class ${identifier} {\n${variants.join(",\n")}\n}`,
  );
  void root;
}

function renderField(
  field: SchemaFieldNode,
  path: string[],
  context: Context,
): { name: string; type: string } {
  return {
    name: fieldName(field.name.source),
    type: renderFieldType(field.type, field.nullable, path, context),
  };
}
function renderFieldType(
  node: SchemaNode,
  nullable: boolean,
  path: string[],
  context: Context,
): string {
  let type = renderNode(node, path, context);
  if (nullable) type = nullableType(type);
  return type;
}
function renderNode(
  node: SchemaNode,
  path: string[],
  context: Context,
): string {
  switch (node.kind) {
    case "scalar":
      return scalarType(node);
    case "reference":
      return kotlinDeclarationIdentifier(node.name);
    case "array":
      return `${hasUniqueItems(context.constraints, path) ? "Set" : "List"}<${renderNode(node.elementType, [...path, "items"], context)}>`;
    case "record":
      return `Map<${renderNode(node.key, [...path, "key"], context)}, ${renderNode(node.value, [...path, "value"], context)}>`;
    case "union":
      return renderUnion(node, path, context);
    case "literal":
      throw new KotlinGenerationError(
        "unsupported-kotlin-node",
        "Kotlin V1 cannot represent an inline literal value; use a named string literal union enum.",
      );
    case "null":
      return "Nothing?";
    default:
      throw new KotlinGenerationError(
        "unsupported-kotlin-node",
        `Kotlin cannot generate node kind "${node.kind}".`,
      );
  }
}
function renderUnion(
  node: Extract<SchemaNode, { kind: "union" }>,
  path: string[],
  context: Context,
): string {
  const nonNull = node.members.filter((member) => member.kind !== "null");
  if (
    node.members.some((member) => member.kind === "null") &&
    nonNull.length === 1
  )
    return nullableType(renderNode(nonNull[0]!, path, context));
  throw new KotlinGenerationError(
    "unsupported-kotlin-node",
    "Kotlin V1 cannot generate general unions.",
  );
}
function scalarType(node: Extract<SchemaNode, { kind: "scalar" }>): string {
  if (node.scalar === "string") return "String";
  if (node.scalar === "boolean") return "Boolean";
  if (node.scalar === "integer") {
    if (
      node.representation &&
      (node.representation.family !== "integer" ||
        node.representation.signedness === "unsigned" ||
        (node.representation.widthBits !== undefined &&
          (typeof node.representation.widthBits !== "number" ||
            ![8, 16, 32, 64].includes(node.representation.widthBits))))
    )
      throw new KotlinGenerationError(
        "unsupported-kotlin-representation",
        "Kotlin V1 cannot preserve this integer representation.",
      );
    const width = node.representation?.widthBits;
    return width === 8
      ? "Byte"
      : width === 16
        ? "Short"
        : width === 32
          ? "Int"
          : "Long";
  }
  if (node.scalar === "number") {
    if (
      node.representation &&
      (node.representation.family !== "float" ||
        (node.representation.widthBits !== undefined &&
          (typeof node.representation.widthBits !== "number" ||
            ![32, 64].includes(node.representation.widthBits))))
    )
      throw new KotlinGenerationError(
        "unsupported-kotlin-representation",
        "Kotlin V1 cannot preserve this floating-point representation.",
      );
    return node.representation?.widthBits === 32 ? "Float" : "Double";
  }
  throw new KotlinGenerationError(
    "unsupported-kotlin-node",
    `Unsupported Kotlin scalar "${node.scalar}".`,
  );
}
function hasUniqueItems(
  constraints: ConstraintDocument | undefined,
  path: string[],
): boolean {
  return Boolean(
    constraints?.entries.some(
      (entry) =>
        entry.target.path.join(".") === path.join(".") &&
        entry.constraints.some(
          (item) => item.kind === "unique-items" && item.value === true,
        ),
    ),
  );
}
function nullableType(type: string): string {
  return type.endsWith("?") ? type : `${type}?`;
}
function fieldName(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value))
    throw new KotlinGenerationError(
      "invalid-kotlin-identifier",
      `"${value}" is not a valid Kotlin property identifier.`,
    );
  return KOTLIN_KEYWORDS.has(value) ? `\`${value}\`` : value;
}
function kotlinDeclarationIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value))
    throw new KotlinGenerationError(
      "invalid-kotlin-identifier",
      `"${value}" is not a valid Kotlin declaration identifier.`,
    );
  return KOTLIN_KEYWORDS.has(value) ? `\`${value}\`` : kotlinIdentifier(value);
}
function enumIdentifier(value: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value))
    return KOTLIN_KEYWORDS.has(value) ? `\`${value}\`` : value;
  const normalized = value
    .replace(/[^A-Za-z0-9_]+/gu, "_")
    .replace(/^([^A-Za-z_])/u, "_$1")
    .toUpperCase();
  if (!normalized || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(normalized))
    throw new KotlinGenerationError(
      "invalid-kotlin-identifier",
      `Cannot normalize enum value "${value}" to a Kotlin identifier.`,
    );
  return KOTLIN_KEYWORDS.has(normalized) ? `\`${normalized}\`` : normalized;
}

function isEnumUnion(
  node: SchemaNode,
): node is Extract<SchemaNode, { kind: "union" }> {
  return (
    node.kind === "union" &&
    node.members.length > 0 &&
    node.members.every(
      (member) => member.kind === "literal" && typeof member.value === "string",
    )
  );
}
