import {
  isDecimalValue,
  isNumericConstraint,
  isNumericConstraintKind,
  numericValueToSafeNumber,
  walkSchemaDocument,
} from "@schema-transformation-toolkit/core";
import type {
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { JsonSchemaGenerateFailureResult } from "./failure.js";
import type { ResolvedJsonSchemaGeneratorOptions } from "./options.js";

export function validateJsonSchemaDocument(
  doc: SchemaDocument,
  options?: Pick<ResolvedJsonSchemaGeneratorOptions, "constraints">,
): JsonSchemaGenerateFailureResult | null {
  const decimalFailure = validateDecimalConstraints(options?.constraints);
  if (decimalFailure !== null) return decimalFailure;

  let failure: JsonSchemaGenerateFailureResult | null = null;

  walkSchemaDocument(
    doc,
    {
      enter(context) {
        if (failure !== null) {
          return;
        }

        switch (context.node.kind) {
          case "scalar":
          case "literal":
          case "null":
          case "unknown":
          case "array":
          case "tuple":
          case "union":
          case "object":
            return;
          case "reference":
            if (context.definitionLookup.has(context.node.name)) {
              return;
            }

            failure = createValidationFailure(
              "invalid-json-schema-reference",
              `The schema reference "${context.node.name}" does not match a renderable definition.`,
              context.path,
              "reference",
              {
                referenceName: context.node.name,
              },
            );
            return;
          case "record":
            if (
              context.node.key.kind === "scalar" &&
              context.node.key.scalar === "string"
            ) {
              return;
            }

            failure = createValidationFailure(
              "invalid-record-key",
              "JSON Schema record keys must render from string scalar keys.",
              [...context.path, "key"],
              "record",
            );
            return;
        }
      },
    },
    { references: "preserve" },
  );

  return failure;
}

function validateDecimalConstraints(
  constraints: ResolvedJsonSchemaGeneratorOptions["constraints"],
): JsonSchemaGenerateFailureResult | null {
  for (const entry of constraints?.entries ?? []) {
    for (const item of entry.constraints) {
      if (!isNumericConstraintKind(item.kind)) continue;
      if (!isNumericConstraint(item)) {
        return createValidationFailure(
          "invalid-numeric-constraint",
          `The numeric constraint "${item.kind}" has an invalid value.`,
          entry.target.path,
          "type",
          { constraintKind: item.kind, value: item.value },
        );
      }
      if (!isDecimalValue(item.value)) continue;
      if (numericValueToSafeNumber(item.value) !== undefined) continue;

      return createValidationFailure(
        "unsupported-decimal-constraint",
        "This JSON Schema generator cannot emit a DecimalValue without losing numeric precision.",
        entry.target.path,
        "type",
        { constraintKind: item.kind, value: item.value.value },
      );
    }
  }

  return null;
}

function createValidationFailure(
  code: JsonSchemaGenerateFailureResult["code"],
  message: string,
  path: string[],
  nodeKind?: SchemaDiagnosticNodeKind,
  evidence?: Record<string, unknown>,
): JsonSchemaGenerateFailureResult {
  const diagnostic: SchemaDiagnostic = {
    severity: "error",
    code,
    message,
    path,
    source: "generator-json-schema",
  };

  if (nodeKind !== undefined) {
    diagnostic.nodeKind = nodeKind;
  }

  if (evidence !== undefined) {
    diagnostic.evidence = evidence;
  }

  return {
    ok: false,
    code,
    message,
    diagnostics: [diagnostic],
  };
}
