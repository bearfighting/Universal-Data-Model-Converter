import type {
  Constraint,
  IdentifierName,
  SchemaDefinition,
  SchemaDocument,
  SchemaFieldNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaTupleElement,
} from "@aio/core";
import type { ZodSemanticObservations } from "./diagnostics.js";
import { addCaveat, addPolicyNote, constraintsAt } from "./diagnostics.js";
import type { ResolvedZodGeneratorOptions } from "./options.js";

const INDENT = "  ";

export function renderZodDocument(
  doc: SchemaDocument,
  options: ResolvedZodGeneratorOptions,
  observations: ZodSemanticObservations,
): string {
  const definitions = new Map(
    doc.definitions.map((definition) => [definition.name.source, definition]),
  );
  const sections = [
    'import { z } from "zod";',
    ...doc.definitions.map((definition) =>
      renderDefinition(definition, options, definitions, observations),
    ),
    renderRoot(doc, options, definitions, observations),
  ];
  return `${sections.join("\n\n")}\n`;
}

function renderDefinition(
  definition: SchemaDefinition,
  options: ResolvedZodGeneratorOptions,
  definitions: ReadonlyMap<string, SchemaDefinition>,
  observations: ZodSemanticObservations,
): string {
  const name = schemaName(definition.name, options);
  const expression = renderNode(
    definition.type,
    ["definitions", definition.name.source],
    options,
    definitions,
    observations,
  );
  return renderSchemaExport(name, expression, options);
}

function renderRoot(
  doc: SchemaDocument,
  options: ResolvedZodGeneratorOptions,
  definitions: ReadonlyMap<string, SchemaDefinition>,
  observations: ZodSemanticObservations,
): string {
  const name = schemaName(doc.name, options);
  const expression = renderNode(
    doc.root,
    ["root"],
    options,
    definitions,
    observations,
  );
  return renderSchemaExport(name, expression, options);
}

function renderSchemaExport(
  name: string,
  expression: string,
  options: ResolvedZodGeneratorOptions,
): string {
  const lines = [`export const ${name}Schema = ${expression};`];
  if (options.outputLanguage === "typescript")
    lines.push(`export type ${name} = z.infer<typeof ${name}Schema>;`);
  return lines.join("\n");
}

function renderNode(
  node: SchemaNode,
  path: string[],
  options: ResolvedZodGeneratorOptions,
  definitions: ReadonlyMap<string, SchemaDefinition>,
  observations: ZodSemanticObservations,
): string {
  let expression: string;
  switch (node.kind) {
    case "scalar":
      expression =
        node.scalar === "string"
          ? "z.string()"
          : node.scalar === "integer"
            ? "z.number().int()"
            : node.scalar === "number"
              ? "z.number()"
              : "z.boolean()";
      break;
    case "literal":
      expression = `z.literal(${JSON.stringify(node.value)})`;
      break;
    case "null":
      expression = "z.null()";
      break;
    case "unknown":
      expression = "z.unknown()";
      break;
    case "reference":
      expression = `z.lazy(() => ${schemaName(definitions.get(node.name)?.name ?? { source: node.name, words: [node.name] }, options)}Schema)`;
      break;
    case "array":
      expression = `z.array(${renderNode(node.elementType, [...path, "items"], options, definitions, observations)})`;
      break;
    case "tuple":
      expression = renderTuple(
        node.elements,
        path,
        options,
        definitions,
        observations,
      );
      break;
    case "record":
      expression = `z.record(${renderNode(node.key, [...path, "key"], options, definitions, observations)}, ${renderNode(node.value, [...path, "value"], options, definitions, observations)})`;
      break;
    case "union":
      expression =
        node.members.length === 1 && node.members[0] !== undefined
          ? renderNode(
              node.members[0],
              path,
              options,
              definitions,
              observations,
            )
          : `z.union([${node.members.map((member) => renderNode(member, path, options, definitions, observations)).join(", ")}])`;
      break;
    case "object":
      expression = renderObject(node, path, options, definitions, observations);
      break;
  }
  return applyConstraints(
    expression,
    constraintsAt(options.constraints, path),
    node,
    path,
    observations,
  );
}

function renderObject(
  node: SchemaObjectNode,
  path: string[],
  options: ResolvedZodGeneratorOptions,
  definitions: ReadonlyMap<string, SchemaDefinition>,
  observations: ZodSemanticObservations,
): string {
  const constraints = constraintsAt(options.constraints, path);
  const closed = constraints.some(
    (constraint) => constraint.kind === "closed-object",
  );
  const fields = node.fields
    .map(
      (field) =>
        `${renderFieldName(field.name, options)}: ${renderField(field, [...path, field.name.source], options, definitions, observations)}`,
    )
    .join(",\n");
  const shape =
    fields.length === 0
      ? "{}"
      : `\n${INDENT}${fields.replaceAll("\n", `\n${INDENT}`)}\n`;
  if (closed) return `z.strictObject({${shape}})`;
  addPolicyNote(
    observations,
    path,
    "Zod output uses strict object handling because the shared shape does not carry explicit open-object evidence.",
    { strategy: "strict", explicitClosedConstraint: false },
  );
  return `z.strictObject({${shape}})`;
}

function renderField(
  field: SchemaFieldNode,
  path: string[],
  options: ResolvedZodGeneratorOptions,
  definitions: ReadonlyMap<string, SchemaDefinition>,
  observations: ZodSemanticObservations,
): string {
  let expression = renderNode(
    field.type,
    path,
    options,
    definitions,
    observations,
  );
  if (field.nullable) expression = `${expression}.nullable()`;
  if (!field.required) expression = `${expression}.optional()`;
  return expression;
}

function renderTuple(
  elements: SchemaTupleElement[],
  path: string[],
  options: ResolvedZodGeneratorOptions,
  definitions: ReadonlyMap<string, SchemaDefinition>,
  observations: ZodSemanticObservations,
): string {
  const rendered = elements.map((element, index) => {
    let expression = renderNode(
      element.type,
      [...path, String(index)],
      options,
      definitions,
      observations,
    );
    if (!element.required) expression += ".optional()";
    return expression;
  });
  return `z.tuple([${rendered.join(", ")}])`;
}

function applyConstraints(
  expression: string,
  constraints: Constraint[],
  node: SchemaNode,
  path: string[],
  observations: ZodSemanticObservations,
): string {
  let result = expression;
  for (const constraint of constraints) {
    const value = constraint.value;
    switch (constraint.kind) {
      case "pattern":
        if (
          typeof value === "string" &&
          node.kind === "scalar" &&
          node.scalar === "string"
        )
          result += `.regex(new RegExp(${JSON.stringify(value)}))`;
        else unsupported(observations, constraint, path, "pattern");
        break;
      case "min-length":
        result = appendNumeric(
          result,
          value,
          ".min",
          constraint,
          path,
          observations,
        );
        break;
      case "max-length":
        result = appendNumeric(
          result,
          value,
          ".max",
          constraint,
          path,
          observations,
        );
        break;
      case "minimum":
        result = appendNumeric(
          result,
          value,
          ".min",
          constraint,
          path,
          observations,
        );
        break;
      case "maximum":
        result = appendNumeric(
          result,
          value,
          ".max",
          constraint,
          path,
          observations,
        );
        break;
      case "exclusive-minimum":
        result = appendNumeric(
          result,
          value,
          ".gt",
          constraint,
          path,
          observations,
        );
        break;
      case "exclusive-maximum":
        result = appendNumeric(
          result,
          value,
          ".lt",
          constraint,
          path,
          observations,
        );
        break;
      case "multiple-of":
        result = appendNumeric(
          result,
          value,
          ".multipleOf",
          constraint,
          path,
          observations,
        );
        break;
      case "min-items":
        result = appendNumeric(
          result,
          value,
          ".min",
          constraint,
          path,
          observations,
        );
        break;
      case "max-items":
        result = appendNumeric(
          result,
          value,
          ".max",
          constraint,
          path,
          observations,
        );
        break;
      case "unique-items":
        if (value === true)
          result +=
            '.refine((items) => new Set(items).size === items.length, { message: "Expected unique items" })';
        else unsupported(observations, constraint, path, "unique-items");
        break;
      case "min-properties":
        result = appendNumeric(
          result,
          value,
          ".refine((value) => Object.keys(value).length >=",
          constraint,
          path,
          observations,
          ")",
        );
        break;
      case "max-properties":
        result = appendNumeric(
          result,
          value,
          ".refine((value) => Object.keys(value).length <=",
          constraint,
          path,
          observations,
          ")",
        );
        break;
      case "format":
        if (
          value === "email" &&
          node.kind === "scalar" &&
          node.scalar === "string"
        )
          result += ".email()";
        else if (
          value === "url" &&
          node.kind === "scalar" &&
          node.scalar === "string"
        )
          result += ".url()";
        else unsupported(observations, constraint, path, "format");
        break;
      case "default":
        if (isJsonValue(value)) result += `.default(${JSON.stringify(value)})`;
        else unsupported(observations, constraint, path, "default");
        break;
      case "description":
      case "examples":
      case "read-only":
      case "write-only":
        result += `.meta(${JSON.stringify({ [metadataKey(constraint.kind)]: value })})`;
        break;
      case "closed-object":
        break;
      default:
        unsupported(observations, constraint, path, constraint.kind);
    }
  }
  return result;
}

function appendNumeric(
  base: string,
  value: unknown,
  method: string,
  constraint: Constraint,
  path: string[],
  observations: ZodSemanticObservations,
  suffix = ")",
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    unsupported(observations, constraint, path, constraint.kind);
    return base;
  }
  if (method.startsWith(".refine")) return `${base}${method}${value}${suffix}`;
  return `${base}${method}(${value})`;
}

function unsupported(
  observations: ZodSemanticObservations,
  constraint: Constraint,
  path: string[],
  detail: string,
): void {
  addCaveat(
    observations,
    "unsupported-zod-constraint",
    `The Zod generator could not map the "${detail}" constraint without guessing.`,
    path,
    "type",
    { constraint: constraint.kind, value: constraint.value },
  );
}

function metadataKey(kind: string): string {
  return kind === "read-only"
    ? "readOnly"
    : kind === "write-only"
      ? "writeOnly"
      : kind;
}
function isJsonValue(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      Array.isArray(value) ||
      (typeof value === "object" && value !== null)
    );
  } catch {
    return false;
  }
}
function schemaName(
  name: IdentifierName,
  options: ResolvedZodGeneratorOptions,
): string {
  return options.namingStrategy.renderTypeName(name);
}
function renderFieldName(
  name: IdentifierName,
  options: ResolvedZodGeneratorOptions,
): string {
  return options.namingStrategy.renderFieldName(name);
}
