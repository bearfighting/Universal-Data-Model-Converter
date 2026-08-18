import type {
  SchemaDefinition,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaNode,
  SchemaValidationResult,
} from "./types.js";
import { walkSchemaDocument } from "./traversal.js";
import { isCompatibleScalarRepresentation } from "./guards.js";

export function validateSchemaDocument(document: SchemaDocument): void {
  const result = tryValidateSchemaDocument(document);

  if (!result.ok) {
    throw new Error(
      result.diagnostics[0]?.message ?? "Invalid schema document.",
    );
  }
}

export function validateSchemaFieldNullability(type: SchemaNode): void {
  const result = tryValidateSchemaFieldNullability(type);

  if (!result.ok) {
    throw new Error(result.diagnostics[0]?.message ?? "Invalid schema field.");
  }
}

export function tryValidateSchemaDocument(
  document: SchemaDocument,
): SchemaValidationResult {
  const diagnostics = collectSchemaDocumentValidationDiagnostics(document);

  if (diagnostics.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    diagnostics,
  };
}

export function tryValidateSchemaFieldNullability(
  type: SchemaNode,
): SchemaValidationResult {
  const diagnostics = collectSchemaFieldNullabilityDiagnostics(type);

  if (diagnostics.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    diagnostics,
  };
}

function collectSchemaDocumentValidationDiagnostics(
  document: SchemaDocument,
): SchemaDiagnostic[] {
  const diagnostics: SchemaDiagnostic[] = [];
  const definitionMap = new Map<string, SchemaDefinition>();

  if (document.rootName && document.rootName.source.trim().length === 0) {
    diagnostics.push({
      severity: "error",
      code: "invalid-root-name",
      message:
        "Invalid schema document: rootName must use a non-empty declaration name.",
      path: ["rootName"],
      nodeKind: "document",
      source: "core",
    });
  }

  for (const definition of document.definitions) {
    if (definition.name.source.trim().length === 0) {
      diagnostics.push({
        severity: "error",
        code: "invalid-definition-name",
        message:
          "Invalid schema document: definitions must use a non-empty name.",
        path: ["definitions"],
        nodeKind: "definition",
        source: "core",
      });
      continue;
    }

    if (definitionMap.has(definition.name.source)) {
      diagnostics.push({
        severity: "error",
        code: "duplicate-definition-name",
        message: `Invalid schema document: duplicate definition name "${definition.name.source}".`,
        path: ["definitions", definition.name.source],
        nodeKind: "definition",
        source: "core",
      });
      continue;
    }

    definitionMap.set(definition.name.source, definition);
  }

  if (document.rootName && document.root.kind === "reference") {
    if (document.rootName.source !== document.root.name) {
      diagnostics.push({
        severity: "error",
        code: "root-name-reference-mismatch",
        message: `Invalid schema document: rootName "${document.rootName.source}" must match root reference "${document.root.name}".`,
        path: ["rootName"],
        nodeKind: "document",
        source: "core",
      });
    } else if (!definitionMap.has(document.rootName.source)) {
      diagnostics.push({
        severity: "error",
        code: "missing-root-definition",
        message: `Invalid schema document: rootName "${document.rootName.source}" must match a definition when root is a reference.`,
        path: ["rootName"],
        nodeKind: "document",
        source: "core",
      });
    }
  }

  if (
    document.rootName &&
    document.root.kind !== "reference" &&
    definitionMap.has(document.rootName.source)
  ) {
    diagnostics.push({
      severity: "error",
      code: "root-name-definition-conflict",
      message: `Invalid schema document: inline rootName "${document.rootName.source}" conflicts with an existing definition of the same name.`,
      path: ["rootName"],
      nodeKind: "document",
      source: "core",
      evidence: {
        rootName: document.rootName.source,
        conflictingDefinition: document.rootName.source,
      },
    });
  }

  walkSchemaDocument(
    document,
    {
      enter(context) {
        if (context.node.kind === "object") {
          const fieldNames = new Set<string>();
          for (const field of context.node.fields) {
            if (fieldNames.has(field.name.source)) {
              diagnostics.push({
                severity: "error",
                code: "duplicate-field-name",
                message: `Invalid schema object: duplicate field name "${field.name.source}".`,
                path: [...context.path, field.name.source],
                nodeKind: "field",
                source: "core",
              });
            }
            if (field.nullable && schemaNodeIncludesNull(field.type)) {
              diagnostics.push({
                severity: "error",
                code: "invalid-field-nullability",
                message:
                  'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
                path: [...context.path, field.name.source],
                nodeKind: "field",
                source: "core",
              });
            }
            fieldNames.add(field.name.source);
          }
        }

        if (
          context.node.kind === "record" &&
          !isSupportedRecordKeyNode(context.node.key)
        ) {
          diagnostics.push({
            severity: "error",
            code: "invalid-record-key",
            message:
              'Invalid schema record: record keys must currently be represented as the scalar type "string".',
            path: [...context.path, "key"],
            nodeKind: "record",
            source: "core",
          });
        }

        if (context.node.kind === "scalar" && context.node.representation) {
          const representation = context.node.representation;
          const compatible = isCompatibleScalarRepresentation(
            context.node.scalar,
            representation,
          );

          if (!compatible) {
            diagnostics.push({
              severity: "error",
              code: "invalid-scalar-representation",
              message: `Invalid scalar representation hint for scalar type "${context.node.scalar}".`,
              path: context.path,
              nodeKind: "scalar",
              source: "core",
            });
          }
        }

        if (context.node.kind !== "reference") {
          return;
        }

        if (definitionMap.has(context.node.name)) {
          return;
        }

        diagnostics.push({
          severity: "error",
          code: "unknown-reference",
          message: `Invalid schema document: reference "${context.node.name}" does not match a known definition.`,
          path: context.path,
          nodeKind: "reference",
          source: "core",
          evidence: {
            referenceName: context.node.name,
          },
        });
      },
    },
    { references: "preserve" },
  );

  return diagnostics;
}

function collectSchemaFieldNullabilityDiagnostics(
  type: SchemaNode,
): SchemaDiagnostic[] {
  if (!schemaNodeIncludesNull(type)) {
    return [];
  }

  return [
    {
      severity: "error",
      code: "invalid-field-nullability",
      message:
        'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
      nodeKind: "field",
      source: "core",
    },
  ];
}

function schemaNodeIncludesNull(type: SchemaNode): boolean {
  if (type.kind === "null") {
    return true;
  }

  if (type.kind === "union") {
    return type.members.some(schemaNodeIncludesNull);
  }

  return false;
}

function isSupportedRecordKeyNode(type: SchemaNode): boolean {
  return type.kind === "scalar" && type.scalar === "string";
}
