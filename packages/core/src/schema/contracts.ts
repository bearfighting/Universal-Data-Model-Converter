import type { SchemaDocument } from "./types.js";

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

export type {
  ParseFailureResult,
  ParseResult,
  ParseSuccessResult,
} from "../pipeline/descriptor-contracts.js";
import type { ParseResult } from "../pipeline/descriptor-contracts.js";

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

export type {
  GenerateFailureResult,
  GenerateResult,
  GenerateSuccessResult,
} from "../pipeline/descriptor-contracts.js";
import type { GenerateResult } from "../pipeline/descriptor-contracts.js";

export interface SchemaGenerator<
  TOutput = string,
  TOptions extends GenerateOptions = GenerateOptions,
  TResult extends GenerateResult<TOutput> = GenerateResult<TOutput>,
> {
  target: string;
  generate(document: SchemaDocument, options?: TOptions): TResult;
}
