# API Snapshot: @schema-transformation-toolkit/parser-go

Entry: packages/parsers/go/src/index.ts

## packages/parsers/go/src/api.d.ts

```ts
import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { type GoParseOptions } from "./options.js";
import type { GoParseFailureResult } from "./failure.js";
export interface GoParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  artifacts?: {
    constraints: ReturnType<
      typeof import("@schema-transformation-toolkit/core").constraintDocument
    >;
  };
  semanticNotes?: import("@schema-transformation-toolkit/core").SchemaSemanticNote[];
}
export type GoParseResult = GoParseSuccessResult | GoParseFailureResult;
export declare function tryParseGo(
  input: string,
  options?: GoParseOptions,
): GoParseResult;
export declare function parseGo(
  input: string,
  options?: GoParseOptions,
): SchemaDocument;
export declare const goParser: {
  format: "go";
  parse(input: string, options?: GoParseOptions): GoParseResult;
};
export declare const preparedGoParserOptions: import("@schema-transformation-toolkit/core").PreparedOptions<
  import("./options.js").ResolvedGoParseOptions
>;
```

## packages/parsers/go/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export declare const goParserCapabilities: ParserCapabilities;
```

## packages/parsers/go/src/descriptor.d.ts

```ts
import type {
  ParserDescriptor,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { GoParseOptions } from "./options.js";
export declare const goParserDescriptor: ParserDescriptor<
  SchemaDocument,
  GoParseOptions
>;
```

## packages/parsers/go/src/failure.d.ts

```ts
import type { ParseFailureResult } from "@schema-transformation-toolkit/core";
export type GoParserFailureCode =
  | "invalid-go-syntax"
  | "unsupported-go-feature"
  | "unsupported-go-type"
  | "unsupported-go-map-key"
  | "unknown-go-reference"
  | "ambiguous-go-entry"
  | "missing-go-entry"
  | "duplicate-go-definition"
  | "invalid-go-data-model"
  | "unsupported-go-parser-v1";
export type GoParseFailureResult = ParseFailureResult<GoParserFailureCode>;
export declare class GoSyntaxError extends Error {
  readonly code: GoParserFailureCode;
  readonly position?: GoPosition | undefined;
  constructor(
    code: GoParserFailureCode,
    message: string,
    position?: GoPosition | undefined,
  );
}
export interface GoPosition {
  offset: number;
  line: number;
  column: number;
}
```

## packages/parsers/go/src/index.d.ts

```ts
export { goParserCapabilities } from "./capabilities.js";
export { goParserDescriptor } from "./descriptor.js";
export {
  parseGo,
  tryParseGo,
  goParser,
  preparedGoParserOptions,
} from "./api.js";
export type { GoParseResult, GoParseSuccessResult } from "./api.js";
export type {
  GoParseFailureResult,
  GoParserFailureCode,
  GoPosition,
} from "./failure.js";
export { GoSyntaxError } from "./failure.js";
export { goParserOptionCatalog } from "./option-metadata.js";
export {
  DEFAULT_GO_PARSE_OPTIONS,
  prepareGoParseOptions,
  resolveGoParseOptions,
  validateGoParseOptions,
} from "./options.js";
export type { GoParseOptions, ResolvedGoParseOptions } from "./options.js";
```

## packages/parsers/go/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const goParserOptionCatalog: OptionCatalog;
```

## packages/parsers/go/src/options.d.ts

```ts
import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface GoParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedGoParseOptions {
  name: string;
  entry?: string;
}
export declare const DEFAULT_GO_PARSE_OPTIONS: ResolvedGoParseOptions;
export declare function resolveGoParseOptions(
  options?: GoParseOptions,
): ResolvedGoParseOptions;
export declare function validateGoParseOptions(
  options: ResolvedGoParseOptions,
): string[];
export declare function prepareGoParseOptions(
  options?: GoParseOptions,
): PreparedOptions<ResolvedGoParseOptions>;
export declare function assertSupportedGoParseOptions(
  options: ResolvedGoParseOptions,
): void;
```
