import type {
  ConversionCapability,
  ConversionReport,
  ConversionIrPreference as CoreConversionIrPreference,
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  SemanticLoss,
  ValueDocument,
  ConversionRoute,
  ParserDescriptor,
  GeneratorDescriptor,
} from "@schema-transformation-toolkit/core";
import type {
  JsonSchemaGeneratorOptions,
  JsonSchemaOutput,
} from "@schema-transformation-toolkit/generator-json-schema";
import type { JsonOutput } from "@schema-transformation-toolkit/generator-json";
import type {
  OpenApiGeneratorOptions,
  OpenApiOutput,
} from "@schema-transformation-toolkit/generator-openapi";
import type { TypeScriptGeneratorOptions } from "@schema-transformation-toolkit/generator-typescript";
import type { ZodGeneratorOptions } from "@schema-transformation-toolkit/generator-zod";
import type { JsonParseOptions } from "@schema-transformation-toolkit/parser-json";
import type { JsonSchemaParseOptions } from "@schema-transformation-toolkit/parser-json-schema";
import type { TypeScriptParseOptions } from "@schema-transformation-toolkit/parser-typescript";
import type { OpenApiParseOptions } from "@schema-transformation-toolkit/parser-openapi";
import type { ZodParseOptions } from "@schema-transformation-toolkit/parser-zod";

export type ConversionIrPreference = CoreConversionIrPreference;

export type BuiltinSourceFormat =
  "json" | "json-schema" | "typescript" | "openapi" | "zod";
export type BuiltinTargetFormat =
  "json" | "json-schema" | "typescript" | "zod" | "openapi";
export interface BuiltinGeneratorOutputs {
  json: JsonOutput;
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
  parser?(format: string): ParserDescriptor;
  generator?(format: string): GeneratorDescriptor;
}

export interface ConvertAdvancedOptions {
  parser?: {
    json?: JsonParseOptions;
    jsonSchema?: JsonSchemaParseOptions;
    typeScript?: TypeScriptParseOptions;
    openapi?: OpenApiParseOptions;
    zod?: ZodParseOptions;
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
  irPreference?: ConversionIrPreference;
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
  TOutput = string | JsonOutput | JsonSchemaOutput | OpenApiOutput,
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

export type ConvertResult<
  TOutput = string | JsonOutput | JsonSchemaOutput | OpenApiOutput,
> = ConvertSuccessResult<TOutput> | ConvertFailureResult;
