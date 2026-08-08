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
  IrTransformerDescriptor,
} from "@schema-transformation-toolkit/core";
import type {
  BuiltinGeneratorOptions,
  BuiltinGeneratorOutputs,
  BuiltinParserOptions,
} from "./builtin-types.js";

export type { BuiltinGeneratorOutputs } from "./builtin-types.js";
export type {
  BuiltinSourceFormat,
  BuiltinTargetFormat,
} from "./builtin-formats.js";

export type ConversionIrPreference = CoreConversionIrPreference;

/** Registry-driven format identity. Builtin format aliases remain available for compatibility. */
export type ConversionFormat = string;
export type ConversionSourceFormat = ConversionFormat;
export type ConversionTargetFormat = ConversionFormat;
export type RegistryOutputMap = object;
export type RegistryConversionOutput<
  TTarget extends string,
  TOutputs extends RegistryOutputMap,
> = TTarget extends keyof TOutputs ? TOutputs[TTarget] : unknown;
export type ConversionOutput<
  TTarget extends string,
  TExtensions extends RegistryOutputMap = Record<never, never>,
> = RegistryConversionOutput<TTarget, BuiltinGeneratorOutputs & TExtensions>;

export interface ExtensionConversionOptions {
  parser?: Record<string, unknown>;
  transformer?: Record<string, unknown>;
  generator?: Record<string, unknown>;
}

export interface GenericConvertAdvancedOptions {
  parser?: unknown;
  transformer?: Record<string, unknown>;
  generator?: unknown;
}

export interface ConversionRegistry {
  registerParser(descriptor: ParserDescriptor): void;
  registerGenerator(
    descriptor: GeneratorDescriptor<never, unknown, unknown>,
  ): void;
  listParsers(): ParserDescriptor[];
  listGenerators(): GeneratorDescriptor<never, unknown, unknown>[];
  registerTransformer?(descriptor: IrTransformerDescriptor): void;
  listTransformers?(): IrTransformerDescriptor[];
  parser?(format: string): ParserDescriptor;
  generator?(format: string): GeneratorDescriptor<never, unknown, unknown>;
  transformer?(id: string): IrTransformerDescriptor;
}

export interface ConvertAdvancedOptions {
  parser?: BuiltinParserOptions;
  transformer?: Record<string, unknown>;
  generator?: BuiltinGeneratorOptions;
}

export interface ConvertOptions {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  input: string;
  name?: string;
  irPreference?: ConversionIrPreference;
  includeArtifacts?: boolean;
  advanced?: ConvertAdvancedOptions | GenericConvertAdvancedOptions;
  extension?: ExtensionConversionOptions;
}

export interface ConversionArtifacts {
  value?: ValueDocument;
  shape?: SchemaDocument;
  constraints?: ConstraintDocument;
}

export interface ConvertSuccessResult<
  TOutput = string | BuiltinGeneratorOutputs[keyof BuiltinGeneratorOutputs],
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
  phase: "parse" | "transform" | "generate";
  plan: ConversionRoute;
  diagnostics?: SchemaDiagnostic[];
  artifacts?: ConversionArtifacts;
  losses?: SemanticLoss[];
  semanticNotes?: SchemaSemanticNote[];
}

export type ConvertResult<
  TOutput = string | BuiltinGeneratorOutputs[keyof BuiltinGeneratorOutputs],
> = ConvertSuccessResult<TOutput> | ConvertFailureResult;
