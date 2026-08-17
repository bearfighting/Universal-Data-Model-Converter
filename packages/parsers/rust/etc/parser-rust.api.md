# API Snapshot: @schema-transformation-toolkit/parser-rust

Entry: packages/parsers/rust/src/index.ts

## packages/parsers/rust/src/api.d.ts

```ts
import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { type RustParseOptions } from "./options.js";
import type { RustParseFailureResult } from "./failure.js";
export interface RustParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  artifacts: {
    constraints: ReturnType<
      typeof import("@schema-transformation-toolkit/core").constraintDocument
    >;
  };
  diagnostics?: never;
  semanticNotes?: import("@schema-transformation-toolkit/core").SchemaSemanticNote[];
}
export type RustParseResult = RustParseSuccessResult | RustParseFailureResult;
export declare function tryParseRust(
  input: string,
  options?: RustParseOptions,
): RustParseResult;
export declare function parseRust(
  input: string,
  options?: RustParseOptions,
): SchemaDocument;
export declare const rustParser: {
  format: "rust";
  parse(input: string, options?: RustParseOptions): RustParseResult;
};
export declare const preparedRustParserOptions: import("@schema-transformation-toolkit/core").PreparedOptions<
  import("./options.js").ResolvedRustParseOptions
>;
```

## packages/parsers/rust/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export declare const rustParserCapabilities: ParserCapabilities;
```

## packages/parsers/rust/src/descriptor.d.ts

```ts
import type {
  ParserDescriptor,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { RustParseOptions } from "./options.js";
export declare const rustParserDescriptor: ParserDescriptor<
  SchemaDocument,
  RustParseOptions
>;
```

## packages/parsers/rust/src/failure.d.ts

```ts
import type { ParseFailureResult } from "@schema-transformation-toolkit/core";
export type RustParserFailureCode =
  | "invalid-rust-syntax"
  | "unsupported-rust-feature"
  | "unsupported-rust-type"
  | "unsupported-rust-attribute"
  | "ambiguous-rust-entry"
  | "missing-rust-entry"
  | "duplicate-rust-definition"
  | "invalid-rust-data-model"
  | "unsupported-rust-map-key"
  | "unsupported-rust-parser-v1";
export type RustParseFailureResult = ParseFailureResult<RustParserFailureCode>;
```

## packages/parsers/rust/src/index.d.ts

```ts
export { rustParserCapabilities } from "./capabilities.js";
export { rustParserDescriptor } from "./descriptor.js";
export { rustParserOptionCatalog } from "./option-metadata.js";
export {
  parseRust,
  preparedRustParserOptions,
  rustParser,
  tryParseRust,
  type RustParseResult,
  type RustParseSuccessResult,
} from "./api.js";
export {
  assertSupportedRustParseOptions,
  prepareRustParseOptions,
  resolveRustParseOptions,
  validateRustParseOptions,
  type ResolvedRustParseOptions,
  type RustParseOptions,
} from "./options.js";
export type {
  RustParseFailureResult,
  RustParserFailureCode,
} from "./failure.js";
```

## packages/parsers/rust/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const rustParserOptionCatalog: OptionCatalog;
```

## packages/parsers/rust/src/options.d.ts

```ts
import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface RustParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedRustParseOptions {
  name: string;
  entry?: string;
}
export declare const DEFAULT_RUST_PARSE_OPTIONS: ResolvedRustParseOptions;
export declare function resolveRustParseOptions(
  options?: RustParseOptions,
): ResolvedRustParseOptions;
export declare function validateRustParseOptions(
  options: ResolvedRustParseOptions,
): string[];
export declare function prepareRustParseOptions(
  options?: RustParseOptions,
): PreparedOptions<ResolvedRustParseOptions>;
export declare function assertSupportedRustParseOptions(
  options: ResolvedRustParseOptions,
): void;
```
