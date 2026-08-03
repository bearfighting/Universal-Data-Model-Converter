# API Snapshot: @aio/sdk

Entry: packages/sdk/src/index.ts

## packages/sdk/src/convert.d.ts

```ts
import type { JsonSchemaOutput } from "@aio/generator-json-schema";
import type { OpenApiOutput } from "@aio/generator-openapi";
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
} from "./registry.js";
import type { ConversionRegistry } from "./types.js";
export type {
  ConvertAdvancedOptions,
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  BuiltinSourceFormat,
  BuiltinTargetFormat,
  BuiltinGeneratorOutputs,
  ConversionFormat,
  ConversionOutput,
  ConversionRegistry,
  ConversionSourceFormat,
  ConversionTargetFormat,
  ExtensionConversionOptions,
} from "./types.js";
import type {
  ConvertOptions,
  ConvertResult,
  ConversionFormat,
  ConversionOutput,
} from "./types.js";
export {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
};
export interface ConversionConverter<
  TExtensions extends Record<string, unknown> = Record<never, never>,
> {
  convert<TTarget extends ConversionFormat>(
    options: ConvertOptions & {
      targetFormat: TTarget;
    },
  ): ConvertResult<ConversionOutput<TTarget, TExtensions>>;
  listConversionRoutes(): ReturnType<typeof listConversionRoutes>;
  planConversion: typeof planConversion;
  describeConversionRouteCapabilities: typeof describeConversionRouteCapabilities;
}
export declare function createConverter<
  TExtensions extends Record<string, unknown> = Record<never, never>,
>(registry: ConversionRegistry): ConversionConverter<TExtensions>;
export declare function convert<
  TOutput = string | JsonSchemaOutput | OpenApiOutput,
>(
  options: ConvertOptions,
  registry?: ConversionRegistry,
): ConvertResult<TOutput>;
```

## packages/sdk/src/index.d.ts

```ts
export {
  convert,
  createConverter,
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
} from "./convert.js";
export {
  createConversionRegistry,
  defaultConversionRegistry,
  DescriptorRegistrationError,
  resolveGeneratorDescriptor,
  resolveParserDescriptor,
} from "./registry.js";
export type { DescriptorRegistrationErrorCode } from "./registry.js";
export {
  conversionArtifactsSchema,
  conversionCapabilityRequirementSchema,
  conversionEntrySelectionSchema,
  conversionLossHotspotSchema,
  conversionPolicyDecisionSchema,
  conversionReportSchema,
  conversionRouteSchema,
  conversionSemanticCaveatSchema,
  convertFailureResultSchema,
  convertSuccessResultSchema,
  publicConvertResultSchema,
  schemaDiagnosticSchema,
  semanticLossSchema,
  conversionOptionCatalogsSchema,
  optionCatalogSchema,
  optionMetadataCategorySchema,
  optionMetadataExampleSchema,
  optionMetadataSchema,
  optionMetadataStageSchema,
  optionValueMetadataSchema,
} from "./public-contract.js";
export {
  describeConversionOptions,
  describeGeneratorOptions,
  describeParserOptions,
  listOptionCatalogs,
} from "./options-metadata.js";
export { inspectTypeScriptImplicitEntry } from "./inspect.js";
export { collectUserFacingDiagnostics } from "./ui-diagnostics.js";
export {
  describeFormatSupport,
  listFormatSupports,
  listSourceFormatSupports,
  listTargetFormatSupports,
} from "./support-matrix.js";
export type {
  UserFacingDiagnostic,
  UserFacingSourcePosition,
  UserFacingSourceRange,
} from "./ui-diagnostics.js";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
} from "./inspect.js";
export type {
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  ConversionSourceFormat,
  ConversionTargetFormat,
  BuiltinSourceFormat,
  BuiltinTargetFormat,
  BuiltinGeneratorOutputs,
  ConversionFormat,
  ConversionOutput,
  ConversionRegistry,
  ExtensionConversionOptions,
} from "./convert.js";
export type {
  ConsumerSurfaceFormat,
  FormatSupportSummary,
  GeneratorSupportSummary,
  ParserSupportSummary,
} from "./support-matrix.js";
export type { ConversionOptionCatalogs } from "./options-metadata.js";
```

## packages/sdk/src/inspect.d.ts

```ts
import {
  type TypeScriptImplicitEntryAmbiguityReason,
  type TypeScriptImplicitEntryAnalysis,
} from "@aio/parser-typescript";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
};
export declare function inspectTypeScriptImplicitEntry(
  input: string,
): TypeScriptImplicitEntryAnalysis;
```

## packages/sdk/src/options-metadata.d.ts

```ts
import type { OptionCatalog } from "@aio/core";
import type {
  ConversionRegistry,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
export interface ConversionOptionCatalogs {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  parser: OptionCatalog;
  generator: OptionCatalog;
}
export declare function describeParserOptions(
  format: ConversionSourceFormat,
  registry?: ConversionRegistry,
): OptionCatalog;
export declare function describeGeneratorOptions(
  format: ConversionTargetFormat,
  registry?: ConversionRegistry,
): OptionCatalog;
export declare function describeConversionOptions(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  registry?: ConversionRegistry,
): ConversionOptionCatalogs;
export declare function listOptionCatalogs(
  registry?: ConversionRegistry,
): OptionCatalog[];
```

## packages/sdk/src/public-contract.d.ts

```ts
import { z } from "zod";
export declare const conversionSourceFormatSchema: z.ZodEnum<{
  "json-schema": "json-schema";
  openapi: "openapi";
  typescript: "typescript";
  json: "json";
}>;
export declare const conversionTargetFormatSchema: z.ZodEnum<{
  "json-schema": "json-schema";
  openapi: "openapi";
  typescript: "typescript";
  zod: "zod";
}>;
export declare const optionMetadataStageSchema: z.ZodEnum<{
  parse: "parse";
  transform: "transform";
  generate: "generate";
}>;
export declare const optionMetadataCategorySchema: z.ZodEnum<{
  diagnostics: "diagnostics";
  inference: "inference";
  selection: "selection";
  formatting: "formatting";
  output: "output";
  semantics: "semantics";
  extension: "extension";
}>;
export declare const optionMetadataExampleSchema: z.ZodObject<
  {
    title: z.ZodString;
    input: z.ZodOptional<z.ZodString>;
    options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    output: z.ZodOptional<z.ZodString>;
    semanticChange: z.ZodOptional<z.ZodString>;
    diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
    explanation: z.ZodString;
  },
  z.core.$strip
>;
export declare const optionValueMetadataSchema: z.ZodObject<
  {
    value: z.ZodUnknown;
    label: z.ZodString;
    description: z.ZodString;
    semanticEffect: z.ZodOptional<z.ZodString>;
    diagnosticEffect: z.ZodOptional<z.ZodString>;
    example: z.ZodOptional<
      z.ZodObject<
        {
          title: z.ZodString;
          input: z.ZodOptional<z.ZodString>;
          options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
          output: z.ZodOptional<z.ZodString>;
          semanticChange: z.ZodOptional<z.ZodString>;
          diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
          explanation: z.ZodString;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const optionMetadataSchema: z.ZodObject<
  {
    key: z.ZodString;
    label: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<{
      diagnostics: "diagnostics";
      inference: "inference";
      selection: "selection";
      formatting: "formatting";
      output: "output";
      semantics: "semantics";
      extension: "extension";
    }>;
    defaultValue: z.ZodUnknown;
    valueDescriptions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            value: z.ZodUnknown;
            label: z.ZodString;
            description: z.ZodString;
            semanticEffect: z.ZodOptional<z.ZodString>;
            diagnosticEffect: z.ZodOptional<z.ZodString>;
            example: z.ZodOptional<
              z.ZodObject<
                {
                  title: z.ZodString;
                  input: z.ZodOptional<z.ZodString>;
                  options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                  output: z.ZodOptional<z.ZodString>;
                  semanticChange: z.ZodOptional<z.ZodString>;
                  diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  explanation: z.ZodString;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >
      >
    >;
    affectedStages: z.ZodArray<
      z.ZodEnum<{
        parse: "parse";
        transform: "transform";
        generate: "generate";
      }>
    >;
    semanticEffect: z.ZodString;
    diagnosticEffect: z.ZodString;
    examples: z.ZodArray<
      z.ZodObject<
        {
          title: z.ZodString;
          input: z.ZodOptional<z.ZodString>;
          options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
          output: z.ZodOptional<z.ZodString>;
          semanticChange: z.ZodOptional<z.ZodString>;
          diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
          explanation: z.ZodString;
        },
        z.core.$strip
      >
    >;
    supported: z.ZodBoolean;
    experimental: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
export declare const optionCatalogSchema: z.ZodObject<
  {
    format: z.ZodString;
    role: z.ZodEnum<{
      parser: "parser";
      generator: "generator";
    }>;
    options: z.ZodArray<
      z.ZodObject<
        {
          key: z.ZodString;
          label: z.ZodString;
          description: z.ZodString;
          category: z.ZodEnum<{
            diagnostics: "diagnostics";
            inference: "inference";
            selection: "selection";
            formatting: "formatting";
            output: "output";
            semantics: "semantics";
            extension: "extension";
          }>;
          defaultValue: z.ZodUnknown;
          valueDescriptions: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  value: z.ZodUnknown;
                  label: z.ZodString;
                  description: z.ZodString;
                  semanticEffect: z.ZodOptional<z.ZodString>;
                  diagnosticEffect: z.ZodOptional<z.ZodString>;
                  example: z.ZodOptional<
                    z.ZodObject<
                      {
                        title: z.ZodString;
                        input: z.ZodOptional<z.ZodString>;
                        options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                        output: z.ZodOptional<z.ZodString>;
                        semanticChange: z.ZodOptional<z.ZodString>;
                        diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        explanation: z.ZodString;
                      },
                      z.core.$strip
                    >
                  >;
                },
                z.core.$strip
              >
            >
          >;
          affectedStages: z.ZodArray<
            z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>
          >;
          semanticEffect: z.ZodString;
          diagnosticEffect: z.ZodString;
          examples: z.ZodArray<
            z.ZodObject<
              {
                title: z.ZodString;
                input: z.ZodOptional<z.ZodString>;
                options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                output: z.ZodOptional<z.ZodString>;
                semanticChange: z.ZodOptional<z.ZodString>;
                diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                explanation: z.ZodString;
              },
              z.core.$strip
            >
          >;
          supported: z.ZodBoolean;
          experimental: z.ZodOptional<z.ZodBoolean>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const conversionOptionCatalogsSchema: z.ZodObject<
  {
    sourceFormat: z.ZodEnum<{
      "json-schema": "json-schema";
      openapi: "openapi";
      typescript: "typescript";
      json: "json";
    }>;
    targetFormat: z.ZodEnum<{
      "json-schema": "json-schema";
      openapi: "openapi";
      typescript: "typescript";
      zod: "zod";
    }>;
    parser: z.ZodObject<
      {
        format: z.ZodString;
        role: z.ZodEnum<{
          parser: "parser";
          generator: "generator";
        }>;
        options: z.ZodArray<
          z.ZodObject<
            {
              key: z.ZodString;
              label: z.ZodString;
              description: z.ZodString;
              category: z.ZodEnum<{
                diagnostics: "diagnostics";
                inference: "inference";
                selection: "selection";
                formatting: "formatting";
                output: "output";
                semantics: "semantics";
                extension: "extension";
              }>;
              defaultValue: z.ZodUnknown;
              valueDescriptions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      value: z.ZodUnknown;
                      label: z.ZodString;
                      description: z.ZodString;
                      semanticEffect: z.ZodOptional<z.ZodString>;
                      diagnosticEffect: z.ZodOptional<z.ZodString>;
                      example: z.ZodOptional<
                        z.ZodObject<
                          {
                            title: z.ZodString;
                            input: z.ZodOptional<z.ZodString>;
                            options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                            output: z.ZodOptional<z.ZodString>;
                            semanticChange: z.ZodOptional<z.ZodString>;
                            diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            explanation: z.ZodString;
                          },
                          z.core.$strip
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >
              >;
              affectedStages: z.ZodArray<
                z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>
              >;
              semanticEffect: z.ZodString;
              diagnosticEffect: z.ZodString;
              examples: z.ZodArray<
                z.ZodObject<
                  {
                    title: z.ZodString;
                    input: z.ZodOptional<z.ZodString>;
                    options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                    output: z.ZodOptional<z.ZodString>;
                    semanticChange: z.ZodOptional<z.ZodString>;
                    diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    explanation: z.ZodString;
                  },
                  z.core.$strip
                >
              >;
              supported: z.ZodBoolean;
              experimental: z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    generator: z.ZodObject<
      {
        format: z.ZodString;
        role: z.ZodEnum<{
          parser: "parser";
          generator: "generator";
        }>;
        options: z.ZodArray<
          z.ZodObject<
            {
              key: z.ZodString;
              label: z.ZodString;
              description: z.ZodString;
              category: z.ZodEnum<{
                diagnostics: "diagnostics";
                inference: "inference";
                selection: "selection";
                formatting: "formatting";
                output: "output";
                semantics: "semantics";
                extension: "extension";
              }>;
              defaultValue: z.ZodUnknown;
              valueDescriptions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      value: z.ZodUnknown;
                      label: z.ZodString;
                      description: z.ZodString;
                      semanticEffect: z.ZodOptional<z.ZodString>;
                      diagnosticEffect: z.ZodOptional<z.ZodString>;
                      example: z.ZodOptional<
                        z.ZodObject<
                          {
                            title: z.ZodString;
                            input: z.ZodOptional<z.ZodString>;
                            options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                            output: z.ZodOptional<z.ZodString>;
                            semanticChange: z.ZodOptional<z.ZodString>;
                            diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            explanation: z.ZodString;
                          },
                          z.core.$strip
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >
              >;
              affectedStages: z.ZodArray<
                z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>
              >;
              semanticEffect: z.ZodString;
              diagnosticEffect: z.ZodString;
              examples: z.ZodArray<
                z.ZodObject<
                  {
                    title: z.ZodString;
                    input: z.ZodOptional<z.ZodString>;
                    options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                    output: z.ZodOptional<z.ZodString>;
                    semanticChange: z.ZodOptional<z.ZodString>;
                    diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    explanation: z.ZodString;
                  },
                  z.core.$strip
                >
              >;
              supported: z.ZodBoolean;
              experimental: z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
export declare const schemaDiagnosticSchema: z.ZodObject<
  {
    severity: z.ZodEnum<{
      error: "error";
      warning: "warning";
      info: "info";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    nodeKind: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const semanticLossSchema: z.ZodObject<
  {
    code: z.ZodString;
    message: z.ZodString;
    severity: z.ZodEnum<{
      error: "error";
      warning: "warning";
      info: "info";
    }>;
    phase: z.ZodEnum<{
      parse: "parse";
      transform: "transform";
      generate: "generate";
    }>;
    lostCapability: z.ZodString;
    sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
    targetFormat: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionRouteSchema: z.ZodObject<
  {
    sourceFormat: z.ZodString;
    targetFormat: z.ZodString;
    irSequence: z.ZodArray<
      z.ZodEnum<{
        value: "value";
        shape: "shape";
        constraint: "constraint";
      }>
    >;
    stages: z.ZodArray<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            "parse-source": "parse-source";
            "lower-to-value": "lower-to-value";
            "infer-shape": "infer-shape";
            "derive-constraints": "derive-constraints";
            "generate-target": "generate-target";
          }>;
          from: z.ZodString;
          to: z.ZodString;
          ir: z.ZodOptional<
            z.ZodEnum<{
              value: "value";
              shape: "shape";
              constraint: "constraint";
            }>
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const conversionSemanticCaveatSchema: z.ZodObject<
  {
    phase: z.ZodEnum<{
      parse: "parse";
      generate: "generate";
    }>;
    kind: z.ZodEnum<{
      normalization: "normalization";
      loss: "loss";
      widening: "widening";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layer: z.ZodOptional<
      z.ZodEnum<{
        value: "value";
        shape: "shape";
        constraint: "constraint";
        target: "target";
      }>
    >;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionPolicyDecisionSchema: z.ZodObject<
  {
    phase: z.ZodEnum<{
      parse: "parse";
      generate: "generate";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionEntrySelectionSchema: z.ZodObject<
  {
    mode: z.ZodLiteral<"implicit">;
    entry: z.ZodString;
    strategyCode: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionCapabilityRequirementSchema: z.ZodObject<
  {
    feature: z.ZodString;
    path: z.ZodArray<z.ZodString>;
    lexicalDefinitionName: z.ZodOptional<z.ZodString>;
    containingDefinitionName: z.ZodOptional<z.ZodString>;
    referenceStack: z.ZodArray<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionLossHotspotSchema: z.ZodObject<
  {
    code: z.ZodString;
    path: z.ZodArray<z.ZodString>;
    lexicalDefinitionName: z.ZodOptional<z.ZodString>;
    containingDefinitionName: z.ZodOptional<z.ZodString>;
    referenceStack: z.ZodArray<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionReportSchema: z.ZodObject<
  {
    diagnostics: z.ZodOptional<
      z.ZodObject<
        {
          parse: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          generate: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          all: z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    losses: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            message: z.ZodString;
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            lostCapability: z.ZodString;
            sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
            targetFormat: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    semanticNotes: z.ZodOptional<
      z.ZodObject<
        {
          parse: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                    policy: "policy";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          generate: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                    policy: "policy";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          all: z.ZodArray<
            z.ZodObject<
              {
                kind: z.ZodEnum<{
                  normalization: "normalization";
                  loss: "loss";
                  widening: "widening";
                  policy: "policy";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                layer: z.ZodOptional<
                  z.ZodEnum<{
                    value: "value";
                    shape: "shape";
                    constraint: "constraint";
                    target: "target";
                  }>
                >;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    semanticCaveats: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            phase: z.ZodEnum<{
              parse: "parse";
              generate: "generate";
            }>;
            kind: z.ZodEnum<{
              normalization: "normalization";
              loss: "loss";
              widening: "widening";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            source: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            layer: z.ZodOptional<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
                target: "target";
              }>
            >;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    capabilityRequirements: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            feature: z.ZodString;
            path: z.ZodArray<z.ZodString>;
            lexicalDefinitionName: z.ZodOptional<z.ZodString>;
            containingDefinitionName: z.ZodOptional<z.ZodString>;
            referenceStack: z.ZodArray<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    lossHotspots: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            path: z.ZodArray<z.ZodString>;
            lexicalDefinitionName: z.ZodOptional<z.ZodString>;
            containingDefinitionName: z.ZodOptional<z.ZodString>;
            referenceStack: z.ZodArray<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    policyDecisions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            phase: z.ZodEnum<{
              parse: "parse";
              generate: "generate";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            source: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    entrySelection: z.ZodOptional<
      z.ZodObject<
        {
          mode: z.ZodLiteral<"implicit">;
          entry: z.ZodString;
          strategyCode: z.ZodString;
          source: z.ZodOptional<z.ZodString>;
          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
          evidence: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const conversionArtifactsSchema: z.ZodObject<
  {
    value: z.ZodOptional<z.ZodUnknown>;
    shape: z.ZodOptional<z.ZodUnknown>;
    constraints: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const convertSuccessResultSchema: z.ZodObject<
  {
    ok: z.ZodLiteral<true>;
    output: z.ZodUnion<
      readonly [
        z.ZodString,
        z.ZodRecord<z.ZodString, z.ZodUnknown>,
        z.ZodBoolean,
      ]
    >;
    plan: z.ZodObject<
      {
        sourceFormat: z.ZodString;
        targetFormat: z.ZodString;
        irSequence: z.ZodArray<
          z.ZodEnum<{
            value: "value";
            shape: "shape";
            constraint: "constraint";
          }>
        >;
        stages: z.ZodArray<
          z.ZodObject<
            {
              kind: z.ZodEnum<{
                "parse-source": "parse-source";
                "lower-to-value": "lower-to-value";
                "infer-shape": "infer-shape";
                "derive-constraints": "derive-constraints";
                "generate-target": "generate-target";
              }>;
              from: z.ZodString;
              to: z.ZodString;
              ir: z.ZodOptional<
                z.ZodEnum<{
                  value: "value";
                  shape: "shape";
                  constraint: "constraint";
                }>
              >;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    report: z.ZodOptional<
      z.ZodObject<
        {
          diagnostics: z.ZodOptional<
            z.ZodObject<
              {
                parse: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        severity: z.ZodEnum<{
                          error: "error";
                          warning: "warning";
                          info: "info";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                generate: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        severity: z.ZodEnum<{
                          error: "error";
                          warning: "warning";
                          info: "info";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                all: z.ZodArray<
                  z.ZodObject<
                    {
                      severity: z.ZodEnum<{
                        error: "error";
                        warning: "warning";
                        info: "info";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      nodeKind: z.ZodOptional<z.ZodString>;
                      source: z.ZodOptional<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
          losses: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  code: z.ZodString;
                  message: z.ZodString;
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  phase: z.ZodEnum<{
                    parse: "parse";
                    transform: "transform";
                    generate: "generate";
                  }>;
                  lostCapability: z.ZodString;
                  sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  targetFormat: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
          semanticNotes: z.ZodOptional<
            z.ZodObject<
              {
                parse: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        kind: z.ZodEnum<{
                          normalization: "normalization";
                          loss: "loss";
                          widening: "widening";
                          policy: "policy";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        layer: z.ZodOptional<
                          z.ZodEnum<{
                            value: "value";
                            shape: "shape";
                            constraint: "constraint";
                            target: "target";
                          }>
                        >;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                generate: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        kind: z.ZodEnum<{
                          normalization: "normalization";
                          loss: "loss";
                          widening: "widening";
                          policy: "policy";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        layer: z.ZodOptional<
                          z.ZodEnum<{
                            value: "value";
                            shape: "shape";
                            constraint: "constraint";
                            target: "target";
                          }>
                        >;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                all: z.ZodArray<
                  z.ZodObject<
                    {
                      kind: z.ZodEnum<{
                        normalization: "normalization";
                        loss: "loss";
                        widening: "widening";
                        policy: "policy";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      nodeKind: z.ZodOptional<z.ZodString>;
                      source: z.ZodOptional<z.ZodString>;
                      layer: z.ZodOptional<
                        z.ZodEnum<{
                          value: "value";
                          shape: "shape";
                          constraint: "constraint";
                          target: "target";
                        }>
                      >;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
          semanticCaveats: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  phase: z.ZodEnum<{
                    parse: "parse";
                    generate: "generate";
                  }>;
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  source: z.ZodOptional<z.ZodString>;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          capabilityRequirements: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  feature: z.ZodString;
                  path: z.ZodArray<z.ZodString>;
                  lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                  containingDefinitionName: z.ZodOptional<z.ZodString>;
                  referenceStack: z.ZodArray<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          lossHotspots: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  code: z.ZodString;
                  path: z.ZodArray<z.ZodString>;
                  lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                  containingDefinitionName: z.ZodOptional<z.ZodString>;
                  referenceStack: z.ZodArray<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          policyDecisions: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  phase: z.ZodEnum<{
                    parse: "parse";
                    generate: "generate";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  source: z.ZodOptional<z.ZodString>;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          entrySelection: z.ZodOptional<
            z.ZodObject<
              {
                mode: z.ZodLiteral<"implicit">;
                entry: z.ZodString;
                strategyCode: z.ZodString;
                source: z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    artifacts: z.ZodOptional<
      z.ZodObject<
        {
          value: z.ZodOptional<z.ZodUnknown>;
          shape: z.ZodOptional<z.ZodUnknown>;
          constraints: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
    diagnostics: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    losses: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            message: z.ZodString;
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            lostCapability: z.ZodString;
            sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
            targetFormat: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    semanticNotes: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            kind: z.ZodEnum<{
              normalization: "normalization";
              loss: "loss";
              widening: "widening";
              policy: "policy";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
                target: "target";
              }>
            >;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
export declare const convertFailureResultSchema: z.ZodObject<
  {
    ok: z.ZodLiteral<false>;
    code: z.ZodString;
    message: z.ZodString;
    phase: z.ZodEnum<{
      parse: "parse";
      generate: "generate";
    }>;
    plan: z.ZodObject<
      {
        sourceFormat: z.ZodString;
        targetFormat: z.ZodString;
        irSequence: z.ZodArray<
          z.ZodEnum<{
            value: "value";
            shape: "shape";
            constraint: "constraint";
          }>
        >;
        stages: z.ZodArray<
          z.ZodObject<
            {
              kind: z.ZodEnum<{
                "parse-source": "parse-source";
                "lower-to-value": "lower-to-value";
                "infer-shape": "infer-shape";
                "derive-constraints": "derive-constraints";
                "generate-target": "generate-target";
              }>;
              from: z.ZodString;
              to: z.ZodString;
              ir: z.ZodOptional<
                z.ZodEnum<{
                  value: "value";
                  shape: "shape";
                  constraint: "constraint";
                }>
              >;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    diagnostics: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
export declare const publicConvertResultSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        ok: z.ZodLiteral<true>;
        output: z.ZodUnion<
          readonly [
            z.ZodString,
            z.ZodRecord<z.ZodString, z.ZodUnknown>,
            z.ZodBoolean,
          ]
        >;
        plan: z.ZodObject<
          {
            sourceFormat: z.ZodString;
            targetFormat: z.ZodString;
            irSequence: z.ZodArray<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
              }>
            >;
            stages: z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    "parse-source": "parse-source";
                    "lower-to-value": "lower-to-value";
                    "infer-shape": "infer-shape";
                    "derive-constraints": "derive-constraints";
                    "generate-target": "generate-target";
                  }>;
                  from: z.ZodString;
                  to: z.ZodString;
                  ir: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                    }>
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >;
        report: z.ZodOptional<
          z.ZodObject<
            {
              diagnostics: z.ZodOptional<
                z.ZodObject<
                  {
                    parse: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            severity: z.ZodEnum<{
                              error: "error";
                              warning: "warning";
                              info: "info";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    generate: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            severity: z.ZodEnum<{
                              error: "error";
                              warning: "warning";
                              info: "info";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    all: z.ZodArray<
                      z.ZodObject<
                        {
                          severity: z.ZodEnum<{
                            error: "error";
                            warning: "warning";
                            info: "info";
                          }>;
                          code: z.ZodString;
                          message: z.ZodString;
                          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                          nodeKind: z.ZodOptional<z.ZodString>;
                          source: z.ZodOptional<z.ZodString>;
                          evidence: z.ZodOptional<z.ZodUnknown>;
                        },
                        z.core.$strip
                      >
                    >;
                  },
                  z.core.$strip
                >
              >;
              losses: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      code: z.ZodString;
                      message: z.ZodString;
                      severity: z.ZodEnum<{
                        error: "error";
                        warning: "warning";
                        info: "info";
                      }>;
                      phase: z.ZodEnum<{
                        parse: "parse";
                        transform: "transform";
                        generate: "generate";
                      }>;
                      lostCapability: z.ZodString;
                      sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      targetFormat: z.ZodOptional<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
              semanticNotes: z.ZodOptional<
                z.ZodObject<
                  {
                    parse: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            kind: z.ZodEnum<{
                              normalization: "normalization";
                              loss: "loss";
                              widening: "widening";
                              policy: "policy";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            layer: z.ZodOptional<
                              z.ZodEnum<{
                                value: "value";
                                shape: "shape";
                                constraint: "constraint";
                                target: "target";
                              }>
                            >;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    generate: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            kind: z.ZodEnum<{
                              normalization: "normalization";
                              loss: "loss";
                              widening: "widening";
                              policy: "policy";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            layer: z.ZodOptional<
                              z.ZodEnum<{
                                value: "value";
                                shape: "shape";
                                constraint: "constraint";
                                target: "target";
                              }>
                            >;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    all: z.ZodArray<
                      z.ZodObject<
                        {
                          kind: z.ZodEnum<{
                            normalization: "normalization";
                            loss: "loss";
                            widening: "widening";
                            policy: "policy";
                          }>;
                          code: z.ZodString;
                          message: z.ZodString;
                          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                          nodeKind: z.ZodOptional<z.ZodString>;
                          source: z.ZodOptional<z.ZodString>;
                          layer: z.ZodOptional<
                            z.ZodEnum<{
                              value: "value";
                              shape: "shape";
                              constraint: "constraint";
                              target: "target";
                            }>
                          >;
                          evidence: z.ZodOptional<z.ZodUnknown>;
                        },
                        z.core.$strip
                      >
                    >;
                  },
                  z.core.$strip
                >
              >;
              semanticCaveats: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      phase: z.ZodEnum<{
                        parse: "parse";
                        generate: "generate";
                      }>;
                      kind: z.ZodEnum<{
                        normalization: "normalization";
                        loss: "loss";
                        widening: "widening";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      source: z.ZodOptional<z.ZodString>;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      layer: z.ZodOptional<
                        z.ZodEnum<{
                          value: "value";
                          shape: "shape";
                          constraint: "constraint";
                          target: "target";
                        }>
                      >;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              capabilityRequirements: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      feature: z.ZodString;
                      path: z.ZodArray<z.ZodString>;
                      lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                      containingDefinitionName: z.ZodOptional<z.ZodString>;
                      referenceStack: z.ZodArray<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              lossHotspots: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      code: z.ZodString;
                      path: z.ZodArray<z.ZodString>;
                      lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                      containingDefinitionName: z.ZodOptional<z.ZodString>;
                      referenceStack: z.ZodArray<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              policyDecisions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      phase: z.ZodEnum<{
                        parse: "parse";
                        generate: "generate";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      source: z.ZodOptional<z.ZodString>;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              entrySelection: z.ZodOptional<
                z.ZodObject<
                  {
                    mode: z.ZodLiteral<"implicit">;
                    entry: z.ZodString;
                    strategyCode: z.ZodString;
                    source: z.ZodOptional<z.ZodString>;
                    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    evidence: z.ZodOptional<z.ZodUnknown>;
                  },
                  z.core.$strip
                >
              >;
            },
            z.core.$strip
          >
        >;
        artifacts: z.ZodOptional<
          z.ZodObject<
            {
              value: z.ZodOptional<z.ZodUnknown>;
              shape: z.ZodOptional<z.ZodUnknown>;
              constraints: z.ZodOptional<z.ZodUnknown>;
            },
            z.core.$strip
          >
        >;
        diagnostics: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
        losses: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                code: z.ZodString;
                message: z.ZodString;
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                phase: z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>;
                lostCapability: z.ZodString;
                sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                targetFormat: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
        preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
        semanticNotes: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                kind: z.ZodEnum<{
                  normalization: "normalization";
                  loss: "loss";
                  widening: "widening";
                  policy: "policy";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                layer: z.ZodOptional<
                  z.ZodEnum<{
                    value: "value";
                    shape: "shape";
                    constraint: "constraint";
                    target: "target";
                  }>
                >;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        ok: z.ZodLiteral<false>;
        code: z.ZodString;
        message: z.ZodString;
        phase: z.ZodEnum<{
          parse: "parse";
          generate: "generate";
        }>;
        plan: z.ZodObject<
          {
            sourceFormat: z.ZodString;
            targetFormat: z.ZodString;
            irSequence: z.ZodArray<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
              }>
            >;
            stages: z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    "parse-source": "parse-source";
                    "lower-to-value": "lower-to-value";
                    "infer-shape": "infer-shape";
                    "derive-constraints": "derive-constraints";
                    "generate-target": "generate-target";
                  }>;
                  from: z.ZodString;
                  to: z.ZodString;
                  ir: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                    }>
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >;
        diagnostics: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
      },
      z.core.$strip
    >,
  ],
  "ok"
>;
```

## packages/sdk/src/registry.d.ts

```ts
import type {
  ConversionRoute,
  ConversionRouteCapabilities,
  GeneratorCapabilities,
  GeneratorDescriptor,
  IrKind,
  ParserCapabilities,
  ParserDescriptor,
  PipelineStage,
} from "@aio/core";
import type { ConversionFormat, ConversionRegistry } from "./types.js";
export type DescriptorRegistrationErrorCode =
  | "descriptor-invalid-version"
  | "descriptor-format-mismatch"
  | "descriptor-options-mismatch"
  | "descriptor-missing-shape-ir"
  | "descriptor-missing-handler"
  | "descriptor-duplicate-format";
export declare class DescriptorRegistrationError extends Error {
  readonly code: DescriptorRegistrationErrorCode;
  constructor(code: DescriptorRegistrationErrorCode, message: string);
}
export declare function createConversionRegistry(options?: {
  parsers?: ParserDescriptor[];
  generators?: GeneratorDescriptor[];
}): ConversionRegistry;
export declare const defaultConversionRegistry: ConversionRegistry;
export declare function listConversionRoutes(
  registry?: ConversionRegistry,
): ConversionRoute[];
export declare function planConversion(
  sourceFormat: ConversionFormat,
  targetFormat: ConversionFormat,
  registry?: ConversionRegistry,
): ConversionRoute;
export declare function describeConversionRouteCapabilities(
  sourceFormat: ConversionFormat,
  targetFormat: ConversionFormat,
  registry?: ConversionRegistry,
): ConversionRouteCapabilities;
export declare function routeUsesIr(
  route: ConversionRoute,
  irKind: IrKind,
): boolean;
export declare function routeStages(route: ConversionRoute): PipelineStage[];
export declare function resolveParserCapabilities(
  sourceFormat: ConversionFormat,
  registry?: ConversionRegistry,
): ParserCapabilities;
export declare function resolveGeneratorCapabilities(
  targetFormat: ConversionFormat,
  registry?: ConversionRegistry,
): GeneratorCapabilities;
export declare function resolveParserDescriptor(
  sourceFormat: ConversionFormat,
  registry?: ConversionRegistry,
): ParserDescriptor;
export declare function resolveGeneratorDescriptor<TOutput = unknown>(
  targetFormat: ConversionFormat,
  registry?: ConversionRegistry,
): GeneratorDescriptor<TOutput>;
```

## packages/sdk/src/support-matrix.d.ts

```ts
import type {
  ConversionCapability,
  GeneratorCapabilities,
  ParserCapabilities,
} from "@aio/core";
import type { ConversionFormat, ConversionRegistry } from "./types.js";
export type ConsumerSurfaceFormat = ConversionFormat;
export interface ParserSupportSummary {
  producesIr: ParserCapabilities["producesIr"];
  capabilities: ConversionCapability[];
}
export interface GeneratorSupportSummary {
  consumesIr: GeneratorCapabilities["consumesIr"];
  capabilities: ConversionCapability[];
}
export interface FormatSupportSummary {
  format: ConsumerSurfaceFormat;
  parser?: ParserSupportSummary;
  generator?: GeneratorSupportSummary;
  sharedShapeKinds: string[];
  constraintFamilies: string[];
  notableLimitations: string[];
  experimentalAreas: string[];
}
export declare function describeFormatSupport(
  format: ConsumerSurfaceFormat,
  registry?: ConversionRegistry,
): FormatSupportSummary;
export declare function listFormatSupports(
  registry?: ConversionRegistry,
): FormatSupportSummary[];
/** Lists formats that can be selected as conversion sources. */
export declare function listSourceFormatSupports(
  registry?: ConversionRegistry,
): FormatSupportSummary[];
/** Lists formats that can be selected as conversion targets. */
export declare function listTargetFormatSupports(
  registry?: ConversionRegistry,
): FormatSupportSummary[];
```

## packages/sdk/src/types.d.ts

```ts
import type {
  ConversionCapability,
  ConversionReport,
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  SemanticLoss,
  ValueDocument,
  ConversionRoute,
  ParserDescriptor,
  GeneratorDescriptor,
} from "@aio/core";
import type {
  JsonSchemaGeneratorOptions,
  JsonSchemaOutput,
} from "@aio/generator-json-schema";
import type {
  OpenApiGeneratorOptions,
  OpenApiOutput,
} from "@aio/generator-openapi";
import type { TypeScriptGeneratorOptions } from "@aio/generator-typescript";
import type { ZodGeneratorOptions } from "@aio/generator-zod";
import type { JsonParseOptions } from "@aio/parser-json";
import type { JsonSchemaParseOptions } from "@aio/parser-json-schema";
import type { TypeScriptParseOptions } from "@aio/parser-typescript";
import type { OpenApiParseOptions } from "@aio/parser-openapi";
export type BuiltinSourceFormat =
  "json" | "json-schema" | "typescript" | "openapi";
export type BuiltinTargetFormat =
  "json-schema" | "typescript" | "zod" | "openapi";
export interface BuiltinGeneratorOutputs {
  "json-schema": JsonSchemaOutput;
  typescript: string;
  zod: string;
  openapi: OpenApiOutput;
}
export type ConversionFormat =
  BuiltinSourceFormat | BuiltinTargetFormat | (string & {});
export type ConversionSourceFormat = ConversionFormat;
export type ConversionTargetFormat = ConversionFormat;
export type ConversionOutput<
  TTarget extends string,
  TExtensions extends Record<string, unknown> = Record<never, never>,
> = TTarget extends keyof BuiltinGeneratorOutputs
  ? BuiltinGeneratorOutputs[TTarget]
  : TTarget extends keyof TExtensions
    ? TExtensions[TTarget]
    : unknown;
export interface ExtensionConversionOptions {
  parser?: Record<string, unknown>;
  generator?: Record<string, unknown>;
}
export interface ConversionRegistry {
  registerParser(descriptor: ParserDescriptor): void;
  registerGenerator(descriptor: GeneratorDescriptor): void;
  listParsers(): ParserDescriptor[];
  listGenerators(): GeneratorDescriptor[];
}
export interface ConvertAdvancedOptions {
  parser?: {
    json?: JsonParseOptions;
    jsonSchema?: JsonSchemaParseOptions;
    typeScript?: TypeScriptParseOptions;
    openapi?: OpenApiParseOptions;
  };
  generator?: {
    jsonSchema?: JsonSchemaGeneratorOptions;
    typeScript?: TypeScriptGeneratorOptions;
    zod?: ZodGeneratorOptions;
    openapi?: OpenApiGeneratorOptions;
  };
}
export interface ConvertOptions {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  input: string;
  name?: string;
  includeArtifacts?: boolean;
  advanced?: ConvertAdvancedOptions;
  extension?: ExtensionConversionOptions;
}
export interface ConversionArtifacts {
  value?: ValueDocument;
  shape?: SchemaDocument;
  constraints?: ConstraintDocument;
}
export interface ConvertSuccessResult<
  TOutput = string | JsonSchemaOutput | OpenApiOutput,
> {
  ok: true;
  output: TOutput;
  plan: ConversionRoute;
  report?: ConversionReport;
  artifacts?: ConversionArtifacts;
  diagnostics?: SchemaDiagnostic[];
  losses?: SemanticLoss[];
  preservedCapabilities?: ConversionCapability[];
  semanticNotes?: SchemaSemanticNote[];
}
export interface ConvertFailureResult {
  ok: false;
  code: string;
  message: string;
  phase: "parse" | "generate";
  plan: ConversionRoute;
  diagnostics?: SchemaDiagnostic[];
}
export type ConvertResult<TOutput = string | JsonSchemaOutput | OpenApiOutput> =
  ConvertSuccessResult<TOutput> | ConvertFailureResult;
```

## packages/sdk/src/ui-diagnostics.d.ts

```ts
import type { ConvertResult } from "./types.js";
export interface UserFacingSourcePosition {
  offset: number;
  line: number;
  column: number;
}
export interface UserFacingSourceRange {
  start: UserFacingSourcePosition;
  end: UserFacingSourcePosition;
  length?: number;
}
export interface UserFacingDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  title: string;
  message: string;
  path?: string;
  source?: string;
  sourceRange?: UserFacingSourceRange;
  suggestion?: string;
  technicalDetails?: unknown;
}
export declare function collectUserFacingDiagnostics(
  result: ConvertResult,
): UserFacingDiagnostic[];
```
