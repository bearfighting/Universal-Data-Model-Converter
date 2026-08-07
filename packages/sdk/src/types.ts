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
import type { YamlOutput } from "@schema-transformation-toolkit/generator-yaml";
import type { CsvOutput } from "@schema-transformation-toolkit/generator-csv";
import type { CsvGeneratorOptions } from "@schema-transformation-toolkit/generator-csv";
import type { JsonParseOptions } from "@schema-transformation-toolkit/parser-json";
import type { JsonSchemaParseOptions } from "@schema-transformation-toolkit/parser-json-schema";
import type { TypeScriptParseOptions } from "@schema-transformation-toolkit/parser-typescript";
import type { OpenApiParseOptions } from "@schema-transformation-toolkit/parser-openapi";
import type { ZodParseOptions } from "@schema-transformation-toolkit/parser-zod";
import type { YamlParseOptions } from "@schema-transformation-toolkit/parser-yaml";
import type { CsvParseOptions } from "@schema-transformation-toolkit/parser-csv";
import type {
  TomlGeneratorOptions,
  TomlOutput,
} from "@schema-transformation-toolkit/generator-toml";
import type { TomlParseOptions } from "@schema-transformation-toolkit/parser-toml";
import type {
  BuiltinSourceFormat,
  BuiltinTargetFormat,
} from "./builtin-formats.js";

export type {
  BuiltinSourceFormat,
  BuiltinTargetFormat,
} from "./builtin-formats.js";

export type ConversionIrPreference = CoreConversionIrPreference;

export interface BuiltinGeneratorOutputs {
  json: JsonOutput;
  "json-schema": JsonSchemaOutput;
  typescript: string;
  zod: string;
  openapi: OpenApiOutput;
  yaml: YamlOutput;
  csv: CsvOutput;
  toml: TomlOutput;
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
    yaml?: YamlParseOptions;
    csv?: CsvParseOptions;
    toml?: TomlParseOptions;
  };
  generator?: {
    jsonSchema?: JsonSchemaGeneratorOptions;
    typeScript?: TypeScriptGeneratorOptions;
    zod?: ZodGeneratorOptions;
    openapi?: OpenApiGeneratorOptions;
    yaml?: Record<string, never>;
    csv?: CsvGeneratorOptions;
    toml?: TomlGeneratorOptions;
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
