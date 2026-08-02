import type { SchemaDiagnostic, SchemaDocument, SchemaNode } from "@aio/core";
import type { ResolvedZodGeneratorOptions } from "./options.js";
import type { ZodGeneratorFailureResult } from "./failure.js";

export function validateZodDocument(
  doc: SchemaDocument,
  options: ResolvedZodGeneratorOptions,
): ZodGeneratorFailureResult | null {
  const names = new Map<string, string>();
  const all = [
    { name: doc.name, path: ["document"] },
    ...doc.definitions.map((definition) => ({
      name: definition.name,
      path: ["definitions", definition.name.source],
    })),
  ];

  for (const entry of all) {
    const rendered = options.namingStrategy.renderTypeName(entry.name);
    if (!isIdentifier(rendered)) {
      return failure(
        "invalid-schema-name",
        `The rendered Zod schema name "${rendered}" is not a valid identifier.`,
        entry.path,
        "document",
        { renderedName: rendered, sourceName: entry.name.source },
      );
    }
    const previous = names.get(rendered);
    if (previous !== undefined && previous !== entry.name.source) {
      return failure(
        "duplicate-rendered-schema-name",
        `The rendered Zod schema name "${rendered}" is used by multiple source names.`,
        entry.path,
        "definition",
        { renderedName: rendered, sourceNames: [previous, entry.name.source] },
      );
    }
    names.set(rendered, entry.name.source);
  }

  const definitions = new Map(
    doc.definitions.map((definition) => [definition.name.source, definition]),
  );
  const check = (
    node: SchemaNode,
    path: string[],
  ): ZodGeneratorFailureResult | null => {
    if (node.kind === "reference" && !definitions.has(node.name)) {
      return failure(
        "invalid-reference-name",
        `The schema reference "${node.name}" does not match a definition.`,
        path,
        "reference",
        { referenceName: node.name },
      );
    }
    if (
      node.kind === "record" &&
      (node.key.kind !== "scalar" || node.key.scalar !== "string")
    ) {
      return failure(
        "invalid-record-key",
        "Zod records require string keys.",
        path,
        "record",
      );
    }
    if (node.kind === "object") {
      const fieldNames = new Set<string>();
      for (const field of node.fields) {
        const rendered = options.namingStrategy.renderFieldName(field.name);
        if (!isProperty(rendered)) {
          return failure(
            "invalid-field-name",
            `The rendered field name "${rendered}" is not valid in a Zod object shape.`,
            [...path, field.name.source],
            "property-name",
            { renderedName: rendered },
          );
        }
        if (fieldNames.has(rendered)) {
          return failure(
            "duplicate-rendered-field-name",
            `Multiple fields render to "${rendered}".`,
            [...path, field.name.source],
            "property-name",
            { renderedName: rendered },
          );
        }
        fieldNames.add(rendered);
        const result = check(field.type, [...path, field.name.source]);
        if (result) return result;
      }
      return null;
    }
    if (node.kind === "array")
      return check(node.elementType, [...path, "items"]);
    if (node.kind === "tuple") {
      for (const [index, element] of node.elements.entries()) {
        const result = check(element.type, [...path, String(index)]);
        if (result) return result;
      }
    }
    if (node.kind === "record") return check(node.value, [...path, "value"]);
    if (node.kind === "union") {
      for (const [index, member] of node.members.entries()) {
        const result = check(member, [...path, String(index)]);
        if (result) return result;
      }
    }
    return null;
  };

  for (const definition of doc.definitions) {
    const result = check(definition.type, [
      "definitions",
      definition.name.source,
    ]);
    if (result) return result;
  }
  return check(doc.root, ["root"]);
}

function isIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function isProperty(value: string): boolean {
  return isIdentifier(value) || (value.startsWith('"') && value.endsWith('"'));
}

function failure(
  code: ZodGeneratorFailureResult extends { code: infer T } ? T : never,
  message: string,
  path: string[],
  nodeKind: SchemaDiagnostic["nodeKind"],
  evidence?: unknown,
): ZodGeneratorFailureResult {
  return {
    ok: false,
    code: code as never,
    message,
    diagnostics: [
      {
        severity: "error",
        code: String(code),
        message,
        path,
        ...(nodeKind === undefined ? {} : { nodeKind }),
        source: "generator-zod",
        ...(evidence === undefined ? {} : { evidence }),
      },
    ],
  };
}
