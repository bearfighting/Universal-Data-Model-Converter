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
import type { TypeScriptGeneratorOptions } from "@aio/generator-typescript";
import type { ZodGeneratorOptions } from "@aio/generator-zod";
import type { JsonParseOptions } from "@aio/parser-json";
import type { JsonSchemaParseOptions } from "@aio/parser-json-schema";
import type { TypeScriptParseOptions } from "@aio/parser-typescript";
import type { OpenApiParseOptions } from "@aio/parser-openapi";

export type BuiltinSourceFormat =
  "json" | "json-schema" | "typescript" | "openapi";
export type BuiltinTargetFormat = "json-schema" | "typescript" | "zod";
export interface BuiltinGeneratorOutputs {
  "json-schema": JsonSchemaOutput;
  typescript: string;
  zod: string;
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

export interface ConvertSuccessResult<TOutput = string | JsonSchemaOutput> {
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

export type ConvertResult<TOutput = string | JsonSchemaOutput> =
  ConvertSuccessResult<TOutput> | ConvertFailureResult;
