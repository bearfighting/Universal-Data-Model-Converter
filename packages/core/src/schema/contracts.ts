import type {
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "./types.js";
import type { ConstraintDocument } from "../constraint/types.js";
import type { OptionCatalog } from "../option-metadata.js";
import type { ValueDocument } from "../value/types.js";
import type { IrKind } from "../pipeline/contracts.js";

export interface ParseOptions {
  name?: string;
}

export interface PreparedOptions<TResolved> {
  resolved: TResolved;
  warnings: string[];
  errors: string[];
}

export interface ConfiguredParser<
  TParser extends SchemaParser = SchemaParser,
  TResolved = unknown,
> {
  parser: TParser;
  prepared: PreparedOptions<TResolved>;
}

export type ParseSuccessResult =
  | {
      ok: true;
      document: SchemaDocument;
      value?: ValueDocument;
      constraints?: ConstraintDocument;
      diagnostics?: SchemaDiagnostic[];
      semanticNotes?: SchemaSemanticNote[];
    }
  | {
      ok: true;
      value: ValueDocument;
      document?: never;
      constraints?: never;
      diagnostics?: SchemaDiagnostic[];
      semanticNotes?: SchemaSemanticNote[];
    };

export interface ParseFailureResult<TCode extends string = string> {
  ok: false;
  code: TCode;
  message: string;
  diagnostics?: SchemaDiagnostic[];
}

export type ParseResult<TCode extends string = string> =
  ParseSuccessResult | ParseFailureResult<TCode>;

export interface SchemaParser<
  TInput = string,
  TOptions extends ParseOptions = ParseOptions,
  TResult extends ParseResult = ParseResult,
> {
  format: string;
  parse(input: TInput, options?: TOptions): TResult;
}

export type GenerateOptions = Record<never, never>;

export interface ConfiguredGenerator<
  TGenerator extends SchemaGenerator<
    unknown,
    GenerateOptions,
    GenerateResult<unknown>
  > = SchemaGenerator,
  TResolved = unknown,
> {
  generator: TGenerator;
  prepared: PreparedOptions<TResolved>;
}

export interface GenerateSuccessResult<TOutput = string> {
  ok: true;
  output: TOutput;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}

export interface GenerateFailureResult<TCode extends string = string> {
  ok: false;
  code: TCode;
  message: string;
  diagnostics?: SchemaDiagnostic[];
}

export type GenerateResult<TOutput = string, TCode extends string = string> =
  GenerateSuccessResult<TOutput> | GenerateFailureResult<TCode>;

export interface SchemaGenerator<
  TOutput = string,
  TOptions extends GenerateOptions = GenerateOptions,
  TResult extends GenerateResult<TOutput> = GenerateResult<TOutput>,
> {
  target: string;
  generate(document: SchemaDocument, options?: TOptions): TResult;
}

export interface ParserExecutionContext {
  name: string;
  targetFormat?: string;
  requestedIr?: readonly IrKind[];
  options?: unknown;
}

export interface GeneratorExecutionContext {
  sourceFormat?: string;
  options?: unknown;
  constraints?: ConstraintDocument;
}

export type DescriptorVersion = "0.1";

export interface ParserDescriptor {
  kind: "parser";
  format: string;
  descriptorVersion: DescriptorVersion;
  capabilities: import("../pipeline/contracts.js").ParserCapabilities;
  options: OptionCatalog;
  parse(input: string, context: ParserExecutionContext): ParseResult;
}

export interface GeneratorDescriptor<TOutput = unknown> {
  kind: "generator";
  format: string;
  descriptorVersion: DescriptorVersion;
  capabilities: import("../pipeline/contracts.js").GeneratorCapabilities;
  options: OptionCatalog;
  analysis?: import("../pipeline/contracts.js").GeneratorAnalysisHooks;
  generate(
    document: SchemaDocument | ValueDocument,
    context: GeneratorExecutionContext,
  ): GenerateResult<TOutput>;
}
