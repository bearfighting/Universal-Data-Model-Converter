import { z } from "zod";
import {
  BUILTIN_SOURCE_FORMATS,
  BUILTIN_TARGET_FORMATS,
} from "./builtin-formats.js";

export const conversionSourceFormatSchema = z.enum(BUILTIN_SOURCE_FORMATS);

export const conversionTargetFormatSchema = z.enum(BUILTIN_TARGET_FORMATS);

export const conversionIrPreferenceSchema = z.enum(["auto", "value", "shape"]);

export const optionMetadataStageSchema = z.enum([
  "parse",
  "transform",
  "generate",
]);

export const optionMetadataCategorySchema = z.enum([
  "inference",
  "diagnostics",
  "selection",
  "formatting",
  "output",
  "semantics",
  "extension",
]);

export const optionMetadataExampleSchema = z.object({
  title: z.string(),
  input: z.string().optional(),
  options: z.record(z.string(), z.unknown()),
  output: z.string().optional(),
  semanticChange: z.string().optional(),
  diagnostics: z.array(z.string()).optional(),
  explanation: z.string(),
});

export const optionValueMetadataSchema = z.object({
  value: z.unknown(),
  label: z.string(),
  description: z.string(),
  semanticEffect: z.string().optional(),
  diagnosticEffect: z.string().optional(),
  example: optionMetadataExampleSchema.optional(),
});

export const optionMetadataSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  category: optionMetadataCategorySchema,
  defaultValue: z.unknown(),
  valueDescriptions: z.array(optionValueMetadataSchema).optional(),
  affectedStages: z.array(optionMetadataStageSchema),
  semanticEffect: z.string(),
  diagnosticEffect: z.string(),
  examples: z.array(optionMetadataExampleSchema),
  supported: z.boolean(),
  experimental: z.boolean().optional(),
});

export const optionCatalogSchema = z.object({
  format: z.string(),
  role: z.enum(["parser", "generator"]),
  options: z.array(optionMetadataSchema),
});

export const conversionOptionCatalogsSchema = z.object({
  sourceFormat: conversionSourceFormatSchema,
  targetFormat: conversionTargetFormatSchema,
  parser: optionCatalogSchema,
  generator: optionCatalogSchema,
  irPreference: optionMetadataSchema,
});

/** Generic registry-aware option catalog contract for custom formats. */
export const genericConversionOptionCatalogsSchema = z.object({
  sourceFormat: z.string(),
  targetFormat: z.string(),
  parser: optionCatalogSchema,
  generator: optionCatalogSchema,
  irPreference: optionMetadataSchema,
});

export const schemaDiagnosticSchema = z.object({
  severity: z.enum(["error", "warning", "info"]),
  code: z.string(),
  message: z.string(),
  path: z.array(z.string()).optional(),
  nodeKind: z.string().optional(),
  source: z.string().optional(),
  evidence: z.unknown().optional(),
});

export const semanticLossSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  phase: z.enum(["parse", "transform", "generate"]),
  lostCapability: z.string(),
  sourcePath: z.array(z.string()).optional(),
  targetFormat: z.string().optional(),
  evidence: z.unknown().optional(),
});

const semanticNoteSchema = z.object({
  kind: z.enum(["normalization", "loss", "widening", "policy"]),
  code: z.string(),
  message: z.string(),
  path: z.array(z.string()).optional(),
  nodeKind: z.string().optional(),
  source: z.string().optional(),
  layer: z.enum(["value", "shape", "constraint", "target"]).optional(),
  evidence: z.unknown().optional(),
});

export const conversionRouteSchema = z.object({
  sourceFormat: z.string(),
  targetFormat: z.string(),
  irSequence: z.array(z.enum(["value", "shape", "constraint"])),
  stages: z.array(
    z.object({
      kind: z.enum([
        "parse-source",
        "lower-to-value",
        "infer-shape",
        "derive-constraints",
        "transform-ir",
        "generate-target",
      ]),
      from: z.string(),
      to: z.string(),
      ir: z.enum(["value", "shape", "constraint"]).optional(),
    }),
  ),
});

const conversionReportStageSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    parse: z.array(itemSchema).optional(),
    transform: z.array(itemSchema).optional(),
    generate: z.array(itemSchema).optional(),
    all: z.array(itemSchema),
  });

export const conversionSemanticCaveatSchema = z.object({
  phase: z.enum(["parse", "generate"]),
  kind: z.enum(["normalization", "loss", "widening"]),
  code: z.string(),
  message: z.string(),
  source: z.string().optional(),
  path: z.array(z.string()).optional(),
  layer: z.enum(["value", "shape", "constraint", "target"]).optional(),
  evidence: z.unknown().optional(),
});

export const conversionPolicyDecisionSchema = z.object({
  phase: z.enum(["parse", "generate"]),
  code: z.string(),
  message: z.string(),
  source: z.string().optional(),
  path: z.array(z.string()).optional(),
  evidence: z.unknown().optional(),
});

export const conversionEntrySelectionSchema = z.object({
  mode: z.literal("implicit"),
  entry: z.string(),
  strategyCode: z.string(),
  source: z.string().optional(),
  path: z.array(z.string()).optional(),
  evidence: z.unknown().optional(),
});

export const conversionCapabilityRequirementSchema = z.object({
  feature: z.string(),
  path: z.array(z.string()),
  lexicalDefinitionName: z.string().optional(),
  containingDefinitionName: z.string().optional(),
  referenceStack: z.array(z.string()),
  evidence: z.unknown().optional(),
});

export const conversionLossHotspotSchema = z.object({
  code: z.string(),
  path: z.array(z.string()),
  lexicalDefinitionName: z.string().optional(),
  containingDefinitionName: z.string().optional(),
  referenceStack: z.array(z.string()),
  evidence: z.unknown().optional(),
});

export const conversionReportSchema = z.object({
  irSelection: z
    .object({
      requested: conversionIrPreferenceSchema,
      selected: z.enum(["value", "shape"]),
      fallback: z.boolean(),
    })
    .optional(),
  diagnostics: conversionReportStageSchema(schemaDiagnosticSchema).optional(),
  losses: z.array(semanticLossSchema).optional(),
  preservedCapabilities: z.array(z.string()).optional(),
  semanticNotes: conversionReportStageSchema(
    z.object({
      kind: z.enum(["normalization", "loss", "widening", "policy"]),
      code: z.string(),
      message: z.string(),
      path: z.array(z.string()).optional(),
      nodeKind: z.string().optional(),
      source: z.string().optional(),
      layer: z.enum(["value", "shape", "constraint", "target"]).optional(),
      evidence: z.unknown().optional(),
    }),
  ).optional(),
  semanticCaveats: z.array(conversionSemanticCaveatSchema).optional(),
  capabilityRequirements: z
    .array(conversionCapabilityRequirementSchema)
    .optional(),
  lossHotspots: z.array(conversionLossHotspotSchema).optional(),
  policyDecisions: z.array(conversionPolicyDecisionSchema).optional(),
  entrySelection: conversionEntrySelectionSchema.optional(),
});

export const conversionArtifactsSchema = z
  .object({
    value: z.unknown().optional(),
    shape: z.unknown().optional(),
    constraints: z.unknown().optional(),
  })
  .refine(
    (value) =>
      value.value !== undefined ||
      value.shape !== undefined ||
      value.constraints !== undefined,
    {
      message: "Conversion artifacts must include at least one artifact.",
    },
  );

export const convertSuccessResultSchema = z.object({
  ok: z.literal(true),
  output: z.union([z.string(), z.record(z.string(), z.unknown()), z.boolean()]),
  plan: conversionRouteSchema,
  report: conversionReportSchema.optional(),
  artifacts: conversionArtifactsSchema.optional(),
  diagnostics: z.array(schemaDiagnosticSchema).optional(),
  losses: z.array(semanticLossSchema).optional(),
  preservedCapabilities: z.array(z.string()).optional(),
  semanticNotes: z.array(semanticNoteSchema).optional(),
});

export const convertFailureResultSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
  phase: z.enum(["parse", "transform", "generate"]),
  plan: conversionRouteSchema,
  diagnostics: z.array(schemaDiagnosticSchema).optional(),
  artifacts: conversionArtifactsSchema.optional(),
  losses: z.array(semanticLossSchema).optional(),
  semanticNotes: z.array(semanticNoteSchema).optional(),
});

export const publicConvertResultSchema = z.discriminatedUnion("ok", [
  convertSuccessResultSchema,
  convertFailureResultSchema,
]);
