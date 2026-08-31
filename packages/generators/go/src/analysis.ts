import {
  walkSchemaDocumentFromRoot,
  type ConversionCapabilityRequirement,
  type ConversionLossHotspot,
  type ConstraintDocument,
  type ConversionRouteCapabilities,
  type SchemaDocument,
  type SemanticLoss,
} from "@schema-transformation-toolkit/core";

export function collectGoCapabilityRequirements(
  document: SchemaDocument,
): ConversionCapabilityRequirement[] {
  const requirements: ConversionCapabilityRequirement[] = [];
  walkSchemaDocumentFromRoot(document, {
    enter(context) {
      if (context.node.kind === "tuple" || context.node.kind === "union") {
        const nullable =
          context.node.kind === "union" &&
          context.node.members.length === 2 &&
          context.node.members.some((member) => member.kind === "null");
        if (!nullable)
          requirements.push({
            feature: "go-unsupported-shape",
            path: [...context.path],
            referenceStack: context.referenceStack.map(
              (frame) => frame.targetDefinition.name.source,
            ),
          });
      }
    },
  });
  return requirements;
}

export function collectGoLossHotspots(
  document: SchemaDocument,
): ConversionLossHotspot[] {
  const hotspots: ConversionLossHotspot[] = [];
  walkSchemaDocumentFromRoot(document, {
    enter(context) {
      if (
        context.node.kind === "scalar" &&
        context.node.scalar === "integer" &&
        !context.node.representation
      )
        hotspots.push({
          code: "go-integer-default-selection",
          path: [...context.path],
          referenceStack: context.referenceStack.map(
            (frame) => frame.targetDefinition.name.source,
          ),
          evidence: {},
        });
    },
  });
  return hotspots;
}

export function planGoSemanticLosses(context: {
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  routeCapabilities: ConversionRouteCapabilities;
  targetFormat: string;
}): SemanticLoss[] {
  if (!context.constraints) return [];
  return context.constraints.entries.flatMap((entry) =>
    entry.constraints.map((constraint) => ({
      code: "target-cannot-preserve-constraint",
      message: `Go output cannot preserve the "${constraint.kind}" constraint.`,
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
