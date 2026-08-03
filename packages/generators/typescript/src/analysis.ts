import {
  walkSchemaDocumentFromRoot,
  type ConstraintDocument,
  type ConversionRouteCapabilities,
  type SemanticLoss,
  type SemanticLossAnalysisContext,
  type SchemaDefinition,
  type SchemaDocument,
  type SchemaNode,
} from "@aio/core";

export type TypeScriptLossHotspotCode =
  "integer-widening" | "wide-unknown" | "unknown-union-absorption";

export interface TypeScriptLossHotspot {
  code: TypeScriptLossHotspotCode;
  path: string[];
  lexicalDefinitionName?: string;
  containingDefinitionName?: string;
  referenceStack: string[];
  evidence: Record<string, unknown>;
}

export type TypeScriptSchemaFeature =
  | "object"
  | "array"
  | "tuple"
  | "record"
  | "union"
  | "optional-field"
  | "nullable-field"
  | "local-reference"
  | "recursive-reference";

export interface TypeScriptCapabilityRequirement {
  feature: TypeScriptSchemaFeature;
  path: string[];
  lexicalDefinitionName?: string;
  containingDefinitionName?: string;
  referenceStack: string[];
  evidence?: Record<string, unknown>;
}

export function collectTypeScriptTargetLossHotspots(
  document: SchemaDocument,
): TypeScriptLossHotspot[] {
  const hotspots: TypeScriptLossHotspot[] = [];

  walkSchemaDocumentFromRoot(
    document,
    {
      enter(context) {
        switch (context.node.kind) {
          case "scalar":
            if (context.node.scalar === "integer") {
              hotspots.push(
                createLossHotspot(context, "integer-widening", {
                  sourceScalar: "integer",
                  renderedScalar: "number",
                }),
              );
            }
            return;
          case "unknown":
            hotspots.push(
              createLossHotspot(context, "wide-unknown", {
                reason: context.node.reason,
                nullable: context.node.nullable,
                renderedForm: context.node.nullable
                  ? "unknown | null"
                  : "unknown",
                ...(context.node.evidence
                  ? { sourceEvidence: context.node.evidence }
                  : {}),
              }),
            );
            return;
          case "union": {
            const unknownMemberIndexes = context.node.members
              .map((member, index) =>
                resolvesToUnknownMember(
                  member,
                  context.definitionLookup,
                  new Set(),
                )
                  ? index
                  : -1,
              )
              .filter((index) => index >= 0);

            if (unknownMemberIndexes.length > 0) {
              hotspots.push(
                createLossHotspot(context, "unknown-union-absorption", {
                  unknownMemberIndexes,
                  memberKinds: context.node.members.map(
                    (member) => member.kind,
                  ),
                }),
              );
            }
            return;
          }
          case "reference":
          case "literal":
          case "null":
          case "array":
          case "tuple":
          case "record":
          case "object":
            return;
        }
      },
    },
    { references: "follow", referenceVisits: "per-occurrence" },
  );

  return hotspots;
}

export function collectTypeScriptCapabilityRequirements(
  document: SchemaDocument,
): TypeScriptCapabilityRequirement[] {
  const requirements: TypeScriptCapabilityRequirement[] = [];

  walkSchemaDocumentFromRoot(
    document,
    {
      enter(context) {
        switch (context.node.kind) {
          case "reference":
            if (context.referenceResolution?.status === "resolved") {
              requirements.push(
                createCapabilityRequirement(context, "local-reference", {
                  targetDefinition:
                    context.referenceResolution.definition.name.source,
                }),
              );
            }

            if (context.referenceResolution?.status === "cycle") {
              requirements.push(
                createCapabilityRequirement(context, "recursive-reference", {
                  referenceName: context.referenceResolution.name,
                }),
              );
            }
            return;
          case "object":
          case "array":
          case "tuple":
          case "record":
          case "union":
            requirements.push(
              createCapabilityRequirement(context, context.node.kind),
            );
            return;
          case "scalar":
          case "literal":
          case "null":
          case "unknown":
            return;
        }
      },
      enterField(context) {
        if (!context.field.required) {
          requirements.push(
            createCapabilityRequirement(context, "optional-field", {
              fieldName: context.field.name.source,
            }),
          );
        }

        if (context.field.nullable) {
          requirements.push(
            createCapabilityRequirement(context, "nullable-field", {
              fieldName: context.field.name.source,
            }),
          );
        }
      },
    },
    { references: "follow", referenceVisits: "once-per-definition" },
  );

  return requirements;
}

export function planTypeScriptSemanticLosses(
  context: SemanticLossAnalysisContext,
): SemanticLoss[] {
  const constraints = context.constraints;
  if (!constraints) return [];

  return planConstraintLosses(
    constraints,
    context.routeCapabilities,
    context.targetFormat,
  );
}

function planConstraintLosses(
  constraints: ConstraintDocument,
  routeCapabilities: ConversionRouteCapabilities,
  targetFormat: string,
): SemanticLoss[] {
  const seen = new Set<string>();
  const losses: SemanticLoss[] = [];

  for (const entry of constraints.entries) {
    for (const item of entry.constraints) {
      const lostCapability = classifyConstraintCapability(item.kind);
      if (
        !routeCapabilities.potentiallyLostCapabilities.includes(lostCapability)
      ) {
        continue;
      }

      const sourcePath = entry.target.path;
      const key = `${lostCapability}:${sourcePath.join("/")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      losses.push({
        code: "target-cannot-preserve-constraint",
        message: `TypeScript output cannot preserve ${renderLossCapability(
          lostCapability,
        )} from ${sourcePath.length > 0 ? sourcePath.join(".") : "root constraint target"}.`,
        severity: "warning",
        phase: "generate",
        lostCapability,
        sourcePath,
        targetFormat,
        evidence: {
          constraintKind: item.kind,
          targetKind: entry.target.kind,
        },
      });
    }
  }

  return losses;
}

function classifyConstraintCapability(
  constraintKind: string,
): SemanticLoss["lostCapability"] {
  if (
    [
      "pattern",
      "minLength",
      "maxLength",
      "min-length",
      "max-length",
      "format",
    ].includes(constraintKind)
  ) {
    return "string-constraints";
  }
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
    ].includes(constraintKind)
  ) {
    return "numeric-constraints";
  }
  if (
    [
      "minItems",
      "maxItems",
      "uniqueItems",
      "min-items",
      "max-items",
      "unique-items",
    ].includes(constraintKind)
  ) {
    return "collection-constraints";
  }
  if (
    [
      "closed-object",
      "minProperties",
      "maxProperties",
      "min-properties",
      "max-properties",
    ].includes(constraintKind)
  ) {
    return "object-constraints";
  }
  return "portable-annotations";
}

function renderLossCapability(
  capability: SemanticLoss["lostCapability"],
): string {
  return capability
    .replace(/-constraints$/u, " constraints")
    .replace("portable-annotations", "portable annotations");
}

function createLossHotspot(
  context: {
    path: string[];
    lexicalDefinition?: SchemaDefinition;
    containingDefinition?: SchemaDefinition;
    referenceStack: readonly { targetDefinition: SchemaDefinition }[];
  },
  code: TypeScriptLossHotspotCode,
  evidence: Record<string, unknown>,
): TypeScriptLossHotspot {
  return {
    code,
    path: [...context.path],
    ...(context.lexicalDefinition
      ? { lexicalDefinitionName: context.lexicalDefinition.name.source }
      : {}),
    ...(context.containingDefinition
      ? {
          containingDefinitionName: context.containingDefinition.name.source,
        }
      : {}),
    referenceStack: context.referenceStack.map(
      (frame) => frame.targetDefinition.name.source,
    ),
    evidence,
  };
}

function createCapabilityRequirement(
  context: {
    path: string[];
    lexicalDefinition?: SchemaDefinition;
    containingDefinition?: SchemaDefinition;
    referenceStack: readonly { targetDefinition: SchemaDefinition }[];
  },
  feature: TypeScriptSchemaFeature,
  evidence?: Record<string, unknown>,
): TypeScriptCapabilityRequirement {
  return {
    feature,
    path: [...context.path],
    ...(context.lexicalDefinition
      ? { lexicalDefinitionName: context.lexicalDefinition.name.source }
      : {}),
    ...(context.containingDefinition
      ? {
          containingDefinitionName: context.containingDefinition.name.source,
        }
      : {}),
    referenceStack: context.referenceStack.map(
      (frame) => frame.targetDefinition.name.source,
    ),
    ...(evidence ? { evidence } : {}),
  };
}

function resolvesToUnknownMember(
  node: SchemaNode,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
  seenReferences: Set<string>,
): boolean {
  if (node.kind === "unknown") {
    return true;
  }

  if (node.kind !== "reference") {
    return false;
  }

  if (seenReferences.has(node.name)) {
    return false;
  }

  const definition = definitionLookup.get(node.name);

  if (definition === undefined) {
    return false;
  }

  seenReferences.add(node.name);

  return resolvesToUnknownMember(
    definition.type,
    definitionLookup,
    seenReferences,
  );
}
