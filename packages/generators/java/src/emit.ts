import type {
  SchemaDocument,
  SchemaFieldNode,
  SchemaNode,
} from "@schema-transformation-toolkit/core";
import { JavaGenerationError } from "./failure.js";
import type { ResolvedJavaGeneratorOptions } from "./options.js";

interface Context {
  options: ResolvedJavaGeneratorOptions;
  imports: Set<string>;
  declarations: string[];
  declared: Set<string>;
}

const JAVA_KEYWORDS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "void",
  "volatile",
  "while",
  "record",
  "sealed",
  "permits",
  "var",
  "true",
  "false",
  "null",
  "_",
]);

export function renderJavaDocument(
  document: SchemaDocument,
  options: ResolvedJavaGeneratorOptions,
): string {
  const context: Context = {
    options,
    imports: new Set(),
    declarations: [],
    declared: new Set(),
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
  if (rootNode.kind !== "object")
    throw new JavaGenerationError(
      "unsupported-java-root",
      "Java generator requires an object root.",
    );
  emitRecord(rootName, rootNode, true, context);
  for (const definition of document.definitions) {
    if (definition.name.source !== rootName)
      emitRecord(definition.name.source, definition.type, false, context);
  }
  const imports = [...context.imports]
    .sort()
    .map((item) => `import ${item};`)
    .join("\n");
  const prefix = imports ? `${imports}\n\n` : "";
  return `${prefix}${context.declarations.join("\n\n")}\n`;
}

function emitRecord(
  name: string,
  node: SchemaNode,
  root: boolean,
  context: Context,
): void {
  const identifier = javaIdentifier(name);
  if (context.declared.has(identifier))
    throw new JavaGenerationError(
      "duplicate-java-definition",
      `Java definition "${name}" was emitted more than once.`,
    );
  if (node.kind !== "object")
    throw new JavaGenerationError(
      "unsupported-java-node",
      `Java definition "${name}" must be an object.`,
    );
  context.declared.add(identifier);
  const components = node.fields
    .map((field) => emitField(field, identifier, context))
    .join(",\n");
  const visibility =
    root && context.options.rootVisibility === "public" ? "public " : "";
  context.declarations.push(
    `${visibility}record ${identifier}(\n${components}\n) {}`,
  );
}

function emitField(
  field: SchemaFieldNode,
  parent: string,
  context: Context,
): string {
  const name = javaIdentifier(field.name.source);
  const type = renderType(
    field.type,
    field.nullable,
    `${parent}${name}`,
    context,
  );
  return `    ${type} ${name}`;
}

function renderType(
  node: SchemaNode,
  nullable: boolean,
  inlineName: string,
  context: Context,
): string {
  if (node.kind === "union") {
    const nonNull = node.members.filter((member) => member.kind !== "null");
    if (nonNull.length === 1 && nonNull.length < node.members.length)
      return renderType(nonNull[0]!, true, inlineName, context);
    throw new JavaGenerationError(
      "unsupported-java-node",
      "Java V1 only generates nullable unions inline.",
    );
  }
  if (node.kind === "scalar") {
    if (node.scalar === "string") return "String";
    if (node.scalar === "boolean") return nullable ? "Boolean" : "boolean";
    if (node.scalar === "integer") {
      const width = node.representation?.widthBits;
      const primitive =
        width === 8
          ? "byte"
          : width === 16
            ? "short"
            : width === 32
              ? "int"
              : "long";
      return nullable ? capitalize(primitive) : primitive;
    }
    if (node.scalar === "number") {
      const primitive =
        node.representation?.family === "float" &&
        node.representation.widthBits === 32
          ? "float"
          : "double";
      return nullable ? capitalize(primitive) : primitive;
    }
  }
  if (node.kind === "reference") return javaIdentifier(node.name);
  if (node.kind === "array") {
    context.imports.add("java.util.List");
    return `List<${renderType(node.elementType, false, `${inlineName}Item`, context)}>`;
  }
  if (node.kind === "record") {
    if (node.key.kind !== "scalar" || node.key.scalar !== "string")
      throw new JavaGenerationError(
        "unsupported-java-node",
        "Java V1 only generates records with string keys.",
      );
    context.imports.add("java.util.Map");
    return `Map<String, ${renderType(node.value, false, `${inlineName}Value`, context)}>`;
  }
  if (node.kind === "object") {
    emitRecord(inlineName, node, false, context);
    return javaIdentifier(inlineName);
  }
  throw new JavaGenerationError(
    "unsupported-java-node",
    `Unsupported Shape IR node "${node.kind}".`,
  );
}

function javaIdentifier(name: string): string {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name) || JAVA_KEYWORDS.has(name))
    throw new JavaGenerationError(
      "invalid-java-identifier",
      `"${name}" is not a valid Java identifier.`,
    );
  return name;
}

function capitalize(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1);
}
