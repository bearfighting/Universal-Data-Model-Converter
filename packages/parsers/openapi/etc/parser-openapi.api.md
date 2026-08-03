# API Snapshot: @aio/parser-openapi

Entry: packages/parsers/openapi/src/index.ts

## packages/parsers/openapi/src/index.d.ts

```ts
import type {
  OptionCatalog,
  ConstraintDocument,
  ParseFailureResult,
  ParseOptions,
  ParserCapabilities,
  ParserDescriptor,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@aio/core";
export interface OpenApiParseOptions extends ParseOptions {
  entry?: string;
}
export type OpenApiParseFailureCode =
  | "invalid-openapi-document"
  | "unsupported-openapi-version"
  | "openapi-schemas-missing"
  | "openapi-entry-required"
  | "openapi-entry-not-found"
  | "openapi-ref-not-found"
  | "unsupported-openapi-keyword"
  | "unsupported-openapi-composition";
export interface OpenApiParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export type OpenApiParseFailureResult = ParseFailureResult<string>;
export type OpenApiParseResult =
  OpenApiParseSuccessResult | OpenApiParseFailureResult;
export declare const openApiParserCapabilities: ParserCapabilities;
export declare const openApiParserOptionCatalog: OptionCatalog;
export declare const openApiParserDescriptor: ParserDescriptor;
export declare function tryParseOpenApiDocument(
  input: string,
  options?: OpenApiParseOptions,
): OpenApiParseResult;
export declare const openApiParser: ParserDescriptor;
```
