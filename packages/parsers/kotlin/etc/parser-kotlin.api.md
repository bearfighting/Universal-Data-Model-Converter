# API Snapshot: @schema-transformation-toolkit/parser-kotlin

Entry: packages/parsers/kotlin/src/index.ts

## packages/parsers/kotlin/src/api.d.ts

```ts
import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { type KotlinPosition } from "./failure.js";
import { type KotlinParseOptions } from "./options.js";
import type { KotlinParseFailureResult } from "./failure.js";
export interface KotlinParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  artifacts: {
    constraints: import("@schema-transformation-toolkit/core").ConstraintDocument;
  };
  semanticNotes?: import("@schema-transformation-toolkit/core").SchemaSemanticNote[];
}
export type KotlinParseResult =
  KotlinParseSuccessResult | KotlinParseFailureResult;
export declare function tryParseKotlin(
  input: string,
  options?: KotlinParseOptions,
): KotlinParseResult;
export declare function parseKotlin(
  input: string,
  options?: KotlinParseOptions,
): SchemaDocument;
export declare const kotlinParser: {
  format: "kotlin";
  parse(input: string, options?: KotlinParseOptions): KotlinParseResult;
};
export declare const preparedKotlinParserOptions: import("@schema-transformation-toolkit/core").PreparedOptions<
  import("./options.js").ResolvedKotlinParseOptions
>;
export type { KotlinPosition };
```

## packages/parsers/kotlin/src/descriptor.d.ts

```ts
import type {
  ParserDescriptor,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { KotlinParseOptions } from "./options.js";
export declare const kotlinParserDescriptor: ParserDescriptor<
  SchemaDocument,
  KotlinParseOptions
>;
```

## packages/parsers/kotlin/src/failure.d.ts

```ts
import type { ParseFailureResult } from "@schema-transformation-toolkit/core";
export interface KotlinPosition {
  offset: number;
  line: number;
  column: number;
}
export type KotlinParserFailureCode =
  | "invalid-kotlin-options"
  | "unsupported-kotlin-declaration"
  | "unsupported-kotlin-type"
  | "unsupported-kotlin-generic"
  | "unsupported-kotlin-map-key"
  | "unsupported-kotlin-enum"
  | "invalid-kotlin-entry"
  | "ambiguous-kotlin-root"
  | "unresolved-kotlin-reference"
  | "invalid-kotlin-identifier"
  | "malformed-kotlin-model"
  | "duplicate-kotlin-definition"
  | "duplicate-kotlin-field"
  | "duplicate-kotlin-member"
  | "empty-kotlin-enum"
  | "empty-kotlin-data-class"
  | "unsupported-kotlin-parser-v1";
export type KotlinParseFailureResult =
  ParseFailureResult<KotlinParserFailureCode>;
export declare class KotlinSyntaxError extends Error {
  readonly code: KotlinParserFailureCode;
  readonly position?: KotlinPosition | undefined;
  constructor(
    code: KotlinParserFailureCode,
    message: string,
    position?: KotlinPosition | undefined,
  );
}
export declare class KotlinSemanticError extends Error {
  readonly code: KotlinParserFailureCode;
  readonly position?: KotlinPosition | undefined;
  constructor(
    code: KotlinParserFailureCode,
    message: string,
    position?: KotlinPosition | undefined,
  );
}
export declare class KotlinOptionsError extends Error {
  readonly code: "invalid-kotlin-options";
  constructor(message: string);
}
```

## packages/parsers/kotlin/src/index.d.ts

```ts
export { kotlinParserDescriptor } from "./descriptor.js";
export { kotlinParser, parseKotlin, tryParseKotlin } from "./api.js";
export type { KotlinParseOptions } from "./options.js";
export type { KotlinParserFailureCode, KotlinPosition } from "./failure.js";
```

## packages/parsers/kotlin/src/options.d.ts

```ts
import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface KotlinParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedKotlinParseOptions {
  name: string;
  entry?: string;
}
export declare const DEFAULT_KOTLIN_PARSE_OPTIONS: ResolvedKotlinParseOptions;
export declare function resolveKotlinParseOptions(
  options?: KotlinParseOptions,
): ResolvedKotlinParseOptions;
export declare function validateKotlinParseOptions(
  options: ResolvedKotlinParseOptions,
): string[];
export declare function prepareKotlinParseOptions(
  options?: KotlinParseOptions,
): PreparedOptions<ResolvedKotlinParseOptions>;
export declare function assertSupportedKotlinParseOptions(
  options: ResolvedKotlinParseOptions,
): void;
```
