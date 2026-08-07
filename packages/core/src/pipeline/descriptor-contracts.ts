import type { OptionCatalog } from "../option-metadata.js";
import type { SchemaDiagnostic, SchemaSemanticNote } from "../schema/types.js";
import type {
  IrArtifacts,
  IrBundle,
  IrDocument,
  IrKind,
  GeneratorCapabilities,
  GeneratorAnalysisHooks,
  ParserCapabilities,
} from "./contracts.js";

export interface ParseSuccessResult<TDocument extends IrDocument = IrDocument> {
  ok: true;
  document: TDocument;
  artifacts?: IrArtifacts;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}

export interface ParseFailureResult<TCode extends string = string> {
  ok: false;
  code: TCode;
  message: string;
  diagnostics?: SchemaDiagnostic[];
}

export type ParseResult<
  TDocument extends IrDocument = IrDocument,
  TCode extends string = string,
> = ParseSuccessResult<TDocument> | ParseFailureResult<TCode>;

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

export interface ParserExecutionContext<TOptions = unknown> {
  name: string;
  requestedIr?: IrKind;
  options?: TOptions;
}

export interface GeneratorExecutionContext<TOptions = unknown> {
  options?: TOptions;
}

export interface TransformerExecutionContext<TOptions = unknown> {
  options?: TOptions;
}

export type DescriptorVersion = "0.1";

export interface ParserDescriptor<
  TDocument extends IrDocument = IrDocument,
  TOptions = unknown,
> {
  kind: "parser";
  format: string;
  descriptorVersion: DescriptorVersion;
  capabilities: ParserCapabilities;
  options: OptionCatalog;
  parse(
    input: string,
    context: ParserExecutionContext<TOptions>,
  ): ParseResult<TDocument>;
}

export interface GeneratorDescriptor<
  TInput extends IrDocument = IrDocument,
  TOutput = unknown,
  TOptions = unknown,
> {
  kind: "generator";
  format: string;
  descriptorVersion: DescriptorVersion;
  capabilities: GeneratorCapabilities;
  options: OptionCatalog;
  analysis?: GeneratorAnalysisHooks;
  generate(
    input: IrBundle<TInput>,
    context: GeneratorExecutionContext<TOptions>,
  ): GenerateResult<TOutput>;
}

export interface TransformSuccessResult<TDocument extends IrDocument> {
  ok: true;
  document: TDocument;
  artifacts?: IrArtifacts;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}

export type TransformResult<
  TDocument extends IrDocument = IrDocument,
  TCode extends string = string,
> = TransformSuccessResult<TDocument> | ParseFailureResult<TCode>;

export interface IrTransformerDescriptor<
  TInput extends IrDocument = IrDocument,
  TOutput extends IrDocument = IrDocument,
  TOptions = unknown,
> {
  kind: "transformer";
  id: string;
  descriptorVersion: DescriptorVersion;
  inputIr: IrKind;
  outputIr: IrKind;
  options?: OptionCatalog;
  transform(
    input: IrBundle<TInput>,
    context: TransformerExecutionContext<TOptions>,
  ): TransformResult<TOutput>;
}
