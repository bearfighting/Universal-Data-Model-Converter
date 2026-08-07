# API Snapshot: @schema-transformation-toolkit/parser-zod

Entry: packages/parsers/zod/src/index.ts

## packages/parsers/zod/src/api.d.ts

```ts
import type {
  ConstraintDocument,
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import {
  type ResolvedZodParseOptions,
  type ZodParseOptions,
} from "./options.js";
export interface ZodInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export type ZodInferenceFailureResult = ParseFailureResult<
  | "invalid-zod-source"
  | "missing-zod-entry"
  | "ambiguous-zod-entry"
  | "missing-zod-schema-binding"
  | "unknown-zod-schema-reference"
  | "unsupported-zod-expression"
  | "unsupported-zod-constructor"
  | "unsupported-zod-method"
  | "unsupported-zod-object-key"
  | "unsupported-zod-lazy"
  | "unsupported-zod-optional-presence"
  | "unsupported-zod-regex-flags"
  | "unsupported-zod-import"
  | "unsupported-zod-reference-cycle"
  | "unsupported-zod-redeclaration"
  | "unsupported-zod-constraint"
  | "unsupported-zod-enum"
  | "unsupported-zod-union"
  | "unsupported-zod-metadata"
  | "unsupported-zod-parser-v0"
>;
export type ZodInferenceResult =
  ZodInferenceSuccessResult | ZodInferenceFailureResult;
export declare function inferZodDocument(
  input: string,
  name?: string,
): SchemaDocument;
export declare function inferZodDocumentWithOptions(
  input: string,
  options?: ZodParseOptions,
): SchemaDocument;
export declare function tryInferZodDocument(
  input: string,
  name?: string,
): ZodInferenceResult;
export declare function tryInferZodDocumentWithOptions(
  input: string,
  options?: ZodParseOptions,
): ZodInferenceResult;
export declare const zodParser: import("@schema-transformation-toolkit/core").SchemaParser<
  string,
  ZodParseOptions,
  ZodInferenceResult
>;
export declare const preparedZodParserOptions: import("@schema-transformation-toolkit/core").PreparedOptions<ResolvedZodParseOptions>;
```

## packages/parsers/zod/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export declare const zodParserCapabilities: ParserCapabilities;
```

## packages/parsers/zod/src/descriptor.d.ts

```ts
import type {
  SchemaDocument,
  ParserDescriptor,
} from "@schema-transformation-toolkit/core";
import type { ZodParseOptions } from "./options.js";
export declare const zodParserDescriptor: ParserDescriptor<
  SchemaDocument,
  ZodParseOptions
>;
```

## packages/parsers/zod/src/errors.d.ts

```ts
import type { SchemaDiagnostic } from "@schema-transformation-toolkit/core";
import ts from "typescript";
export type ZodInferenceErrorCode =
  | "invalid-zod-source"
  | "missing-zod-entry"
  | "ambiguous-zod-entry"
  | "missing-zod-schema-binding"
  | "unknown-zod-schema-reference"
  | "unsupported-zod-expression"
  | "unsupported-zod-constructor"
  | "unsupported-zod-method"
  | "unsupported-zod-object-key"
  | "unsupported-zod-lazy"
  | "unsupported-zod-optional-presence"
  | "unsupported-zod-regex-flags"
  | "unsupported-zod-import"
  | "unsupported-zod-reference-cycle"
  | "unsupported-zod-redeclaration"
  | "unsupported-zod-constraint"
  | "unsupported-zod-enum"
  | "unsupported-zod-union"
  | "unsupported-zod-metadata"
  | "unsupported-zod-parser-v0";
export declare class ZodInferenceError extends Error {
  readonly code: ZodInferenceErrorCode;
  readonly diagnostics: SchemaDiagnostic[];
  constructor(
    code: ZodInferenceErrorCode,
    message: string,
    diagnostics: SchemaDiagnostic[],
  );
}
export declare function isZodInferenceError(
  error: unknown,
): error is ZodInferenceError;
export declare function throwZodInferenceError(
  code: ZodInferenceErrorCode,
  message: string,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  path: string[],
): never;
```

## packages/parsers/zod/src/index.d.ts

```ts
export { ZodInferenceError, isZodInferenceError } from "./errors.js";
export { zodParserCapabilities } from "./capabilities.js";
export { zodParserDescriptor } from "./descriptor.js";
export { zodParserOptionCatalog } from "./option-metadata.js";
export {
  inferZodDocument,
  inferZodDocumentWithOptions,
  preparedZodParserOptions,
  tryInferZodDocument,
  tryInferZodDocumentWithOptions,
  zodParser,
  type ZodInferenceFailureResult,
  type ZodInferenceResult,
  type ZodInferenceSuccessResult,
} from "./api.js";
export {
  DEFAULT_ZOD_PARSE_OPTIONS,
  assertSupportedZodParseOptions,
  configureZodParser,
  createZodParser,
  prepareZodParseOptions,
  resolveZodParseOptions,
  validateZodParseOptions,
  type ResolvedZodParseOptions,
  type ZodParseOptions,
} from "./options.js";
```

## packages/parsers/zod/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const zodParserOptionCatalog: OptionCatalog;
```

## packages/parsers/zod/src/options.d.ts

```ts
import type {
  ConfiguredParser,
  ParseOptions,
  PreparedOptions,
  SchemaParser,
} from "@schema-transformation-toolkit/core";
import type { ZodInferenceResult } from "./api.js";
export interface ZodParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedZodParseOptions {
  name: string;
  entry?: string;
}
export declare const DEFAULT_ZOD_PARSE_OPTIONS: ResolvedZodParseOptions;
export declare function resolveZodParseOptions(
  options?: ZodParseOptions,
): ResolvedZodParseOptions;
export declare function validateZodParseOptions(
  options: ResolvedZodParseOptions,
): string[];
export declare function assertSupportedZodParseOptions(
  options: ResolvedZodParseOptions,
): void;
export declare function prepareZodParseOptions(
  options?: ZodParseOptions,
): PreparedOptions<ResolvedZodParseOptions>;
export declare function createZodParser(
  parseWithOptions: (
    input: string,
    options: ResolvedZodParseOptions,
  ) => ZodInferenceResult,
  options?: ZodParseOptions,
): SchemaParser<string, ZodParseOptions, ZodInferenceResult>;
export declare function configureZodParser(
  parseWithOptions: (
    input: string,
    options: ResolvedZodParseOptions,
  ) => ZodInferenceResult,
  options?: ZodParseOptions,
): ConfiguredParser<
  SchemaParser<string, ZodParseOptions, ZodInferenceResult>,
  ResolvedZodParseOptions
>;
```
