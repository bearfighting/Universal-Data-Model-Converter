import type {
  SemanticLoss,
  SemanticLossAnalysisContext,
} from "@schema-transformation-toolkit/core";

export function planPythonSemanticLosses(
  context: SemanticLossAnalysisContext,
): SemanticLoss[] {
  if (!context.constraints) return [];
  return context.constraints.entries.flatMap((entry) =>
    entry.constraints.map((constraint) => ({
      code: "target-cannot-preserve-constraint",
      message: `Python dataclass annotations cannot preserve the "${constraint.kind}" constraint.`,
      severity: "warning" as const,
      phase: "generate" as const,
      lostCapability: classifyConstraint(constraint.kind),
      sourcePath: entry.target.path,
      targetFormat: context.targetFormat,
      evidence: {
        constraintKind: constraint.kind,
        targetKind: entry.target.kind,
      },
    })),
  );
}

function classifyConstraint(kind: string): SemanticLoss["lostCapability"] {
  if (
    [
      "pattern",
      "minLength",
      "maxLength",
      "format",
      "min-length",
      "max-length",
    ].includes(kind)
  )
    return "string-constraints";
  if (
    [
      "minimum",
      "maximum",
      "exclusiveMinimum",
      "exclusiveMaximum",
      "multipleOf",
      "exclusive-minimum",
      "exclusive-maximum",
      "multiple-of",
    ].includes(kind)
  )
    return "numeric-constraints";
  if (
    [
      "minItems",
      "maxItems",
      "uniqueItems",
      "min-items",
      "max-items",
      "unique-items",
    ].includes(kind)
  )
    return "collection-constraints";
  if (
    [
      "closed-object",
      "minProperties",
      "maxProperties",
      "min-properties",
      "max-properties",
    ].includes(kind)
  )
    return "object-constraints";
  return "portable-annotations";
}

export function collectPythonTargetLossHotspots(
  document: import("@schema-transformation-toolkit/core").SchemaDocument,
) {
  void document;
  return [];
}
