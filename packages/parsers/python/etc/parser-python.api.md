# API Snapshot: @schema-transformation-toolkit/parser-python

Entry: packages/parsers/python/src/index.ts

## packages/parsers/python/src/api.d.ts

```ts
import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { type PythonParseOptions } from "./options.js";
import type { PythonParseFailureResult } from "./failure.js";
export interface PythonParseSuccessResult {
  ok: true;
  document: SchemaDocument;
}
export type PythonParseResult =
  PythonParseSuccessResult | PythonParseFailureResult;
export declare function tryParsePython(
  input: string,
  options?: PythonParseOptions,
): PythonParseResult;
export declare function parsePython(
  input: string,
  options?: PythonParseOptions,
): SchemaDocument;
export declare const pythonParser: {
  format: "python";
  parse(input: string, options?: PythonParseOptions): PythonParseResult;
};
export declare const preparedPythonParserOptions: import("@schema-transformation-toolkit/core").PreparedOptions<
  import("./options.js").ResolvedPythonParseOptions
>;
```

## packages/parsers/python/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export declare const pythonParserCapabilities: ParserCapabilities;
```

## packages/parsers/python/src/descriptor.d.ts

```ts
import type {
  ParserDescriptor,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { PythonParseOptions } from "./options.js";
export declare const pythonParserDescriptor: ParserDescriptor<
  SchemaDocument,
  PythonParseOptions
>;
```

## packages/parsers/python/src/failure.d.ts

```ts
import type { ParseFailureResult } from "@schema-transformation-toolkit/core";
export type PythonParserFailureCode =
  | "invalid-python-syntax"
  | "unsupported-python-feature"
  | "unsupported-python-type"
  | "unsupported-python-union"
  | "unsupported-python-default"
  | "unsupported-python-decorator"
  | "unsupported-python-inheritance"
  | "unknown-python-reference"
  | "ambiguous-python-entry"
  | "missing-python-entry"
  | "duplicate-python-definition"
  | "invalid-python-data-model"
  | "unsupported-python-parser-v1";
export type PythonFailureCode = PythonParserFailureCode;
export type PythonParseFailureResult =
  ParseFailureResult<PythonParserFailureCode>;
export declare class PythonSyntaxError extends Error {
  readonly code: PythonFailureCode;
  readonly position?:
    | {
        offset: number;
        line: number;
        column: number;
      }
    | undefined;
  constructor(
    code: PythonFailureCode,
    message: string,
    position?:
      | {
          offset: number;
          line: number;
          column: number;
        }
      | undefined,
  );
}
```

## packages/parsers/python/src/index.d.ts

```ts
export { pythonParserCapabilities } from "./capabilities.js";
export { pythonParserDescriptor } from "./descriptor.js";
export {
  parsePython,
  tryParsePython,
  pythonParser,
  preparedPythonParserOptions,
} from "./api.js";
export type { PythonParseResult, PythonParseSuccessResult } from "./api.js";
export type {
  PythonParseFailureResult,
  PythonFailureCode,
  PythonParserFailureCode,
} from "./failure.js";
export { PythonSyntaxError } from "./failure.js";
export { pythonParserOptionCatalog } from "./option-metadata.js";
export {
  DEFAULT_PYTHON_PARSE_OPTIONS,
  preparePythonParseOptions,
  resolvePythonParseOptions,
  validatePythonParseOptions,
} from "./options.js";
export type {
  PythonParseOptions,
  ResolvedPythonParseOptions,
} from "./options.js";
```

## packages/parsers/python/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const pythonParserOptionCatalog: OptionCatalog;
```

## packages/parsers/python/src/options.d.ts

```ts
import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface PythonParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedPythonParseOptions {
  name: string;
  entry?: string;
}
export declare const DEFAULT_PYTHON_PARSE_OPTIONS: ResolvedPythonParseOptions;
export declare function resolvePythonParseOptions(
  options?: PythonParseOptions,
): ResolvedPythonParseOptions;
export declare function validatePythonParseOptions(
  options: ResolvedPythonParseOptions,
): string[];
export declare function preparePythonParseOptions(
  options?: PythonParseOptions,
): PreparedOptions<ResolvedPythonParseOptions>;
export declare function assertSupportedPythonParseOptions(
  options: ResolvedPythonParseOptions,
): void;
```
