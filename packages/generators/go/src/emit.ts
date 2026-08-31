import {
  type SchemaDocument,
  type SchemaFieldNode,
  type SchemaNode,
} from "@schema-transformation-toolkit/core";
import { GoGenerationError } from "./failure.js";
import { goIdentifier } from "./identifiers.js";
import type { ResolvedGoGeneratorOptions } from "./options.js";
interface Context {
  options: ResolvedGoGeneratorOptions;
  declarations: string[];
  declared: Map<string, string>;
}
export function renderGoDocument(
  document: SchemaDocument,
  options: ResolvedGoGeneratorOptions,
): string {
  const context: Context = { options, declarations: [], declared: new Map() };
  const rootReferenceName =
    document.root.kind === "reference" ? document.root.name : undefined;
  const rootName =
    rootReferenceName ?? document.rootName?.source ?? document.name.source;
  const rootDefinition = rootReferenceName
    ? document.definitions.find(
        (item) => item.name.source === rootReferenceName,
      )
    : undefined;
  const rootNode = rootDefinition?.type ?? document.root;
  if (rootNode.kind !== "object")
    throw new GoGenerationError(
      "unsupported-go-root",
      "Go generator requires an object root.",
    );
  emitDefinition(rootName, rootNode, context);
  for (const definition of document.definitions)
    if (definition.name.source !== rootName)
      emitDefinition(definition.name.source, definition.type, context);
  return `package ${options.packageName}\n\n${context.declarations.join("\n\n")}\n`;
}
function emitDefinition(
  name: string,
  node: SchemaNode,
  context: Context,
): void {
  const identifier = goIdentifier(name);
  const previous = context.declared.get(identifier);
  if (previous) {
    if (previous !== name)
      throw new GoGenerationError(
        "invalid-go-identifier",
        `Go definitions "${previous}" and "${name}" collide as "${identifier}".`,
      );
    return;
  }
  if (node.kind !== "object" && node.kind !== "scalar")
    throw new GoGenerationError(
      "unsupported-go-node",
      `Go definition "${name}" must be an object or scalar named type.`,
    );
  context.declared.set(identifier, name);
  if (node.kind === "scalar") {
    context.declarations.push(
      `type ${identifier} ${renderNode(node, identifier, context)}`,
    );
    return;
  }
  const fieldNames = new Map<string, string>();
  const fields = node.fields.map((field) =>
    emitField(field, identifier, context, fieldNames),
  );
  context.declarations.push(
    `type ${identifier} struct {\n${formatFields(fields)}\n}`,
  );
}
function emitField(
  field: SchemaFieldNode,
  parent: string,
  context: Context,
  fieldNames: Map<string, string>,
): string {
  const fieldName = goIdentifier(field.name.source);
  const previous = fieldNames.get(fieldName);
  if (previous) {
    throw new GoGenerationError(
      "invalid-go-identifier",
      `Go fields "${previous}" and "${field.name.source}" collide as "${fieldName}".`,
    );
  }
  fieldNames.set(fieldName, field.name.source);
  const base = renderNode(field.type, parent + fieldName, context);
  const nullable = field.nullable || includesNull(field.type);
  const type = nullable || !field.required ? pointerType(base) : base;
  if (context.options.emitJsonTags && field.name.source.includes("`"))
    throw new GoGenerationError(
      "invalid-go-struct-tag",
      `JSON field name "${field.name.source}" cannot be emitted in a raw Go struct tag.`,
    );
  const tag = context.options.emitJsonTags
    ? `\t\`json:"${escapeStructTag(field.name.source)}${field.required ? "" : ",omitempty"}"\``
    : "";
  return `${fieldName}\t${type}${tag}`;
}
function renderNode(
  node: SchemaNode,
  inlineName: string,
  context: Context,
): string {
  switch (node.kind) {
    case "scalar":
      if (node.scalar === "string") return "string";
      if (node.scalar === "boolean") return "bool";
      if (node.scalar === "number")
        return node.representation?.family === "float" &&
          node.representation.widthBits === 32
          ? "float32"
          : "float64";
      if (node.scalar === "integer") {
        const rep = node.representation;
        if (rep?.family === "integer" && rep.signedness && rep.widthBits) {
          if (rep.widthBits === "pointer")
            return rep.signedness === "unsigned" ? "uint" : "int";
          return `${rep.signedness === "unsigned" ? "uint" : "int"}${rep.widthBits}`;
        }
        return "int64";
      }
      throw new GoGenerationError(
        "unsupported-go-node",
        `Unsupported scalar "${node.scalar}".`,
      );
    case "reference":
      return goIdentifier(node.name);
    case "array":
      return `[]${renderNode(node.elementType, inlineName + "Item", context)}`;
    case "record":
      return `map[string]${renderNode(node.value, inlineName + "Value", context)}`;
    case "unknown":
      return "any";
    case "object": {
      const name = goIdentifier(inlineName);
      emitDefinition(name, node, context);
      return name;
    }
    case "union": {
      const nonNull = node.members.filter((member) => member.kind !== "null");
      if (nonNull.length === 1 && nonNull.length !== node.members.length)
        return pointerType(renderNode(nonNull[0]!, inlineName, context));
      throw new GoGenerationError(
        "unsupported-go-union",
        "Go V1 only generates nullable unions inline.",
      );
    }
    default:
      throw new GoGenerationError(
        "unsupported-go-node",
        `Unsupported Go Shape IR node "${node.kind}".`,
      );
  }
}
function includesNull(node: SchemaNode): boolean {
  return (
    node.kind === "union" &&
    node.members.some((member) => member.kind === "null")
  );
}
function pointerType(type: string): string {
  return type.startsWith("*") ? type : `*${type}`;
}

function formatFields(fields: string[]): string {
  const columns = fields.map((field) => field.split("\t"));
  const nameWidth = Math.max(...columns.map((field) => field[0]?.length ?? 0));
  const typeWidth = Math.max(...columns.map((field) => field[1]?.length ?? 0));
  return columns
    .map(([name, type, tag]) => {
      const line = `\t${name?.padEnd(nameWidth + 1)}${type?.padEnd(typeWidth + 1)}`;
      return tag ? `${line}${tag}` : line.trimEnd();
    })
    .join("\n");
}

function escapeStructTag(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t");
}
