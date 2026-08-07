# API Snapshot: @schema-transformation-toolkit/parser-csv

Entry: packages/parsers/csv/src/index.ts

## packages/parsers/csv/src/api.d.ts

```ts
import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import type { CsvParseOptions } from "./options.js";
export interface CsvParseSuccessResult {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}
export type CsvParseFailureResult = ParseFailureResult<string>;
export type CsvParseResult = CsvParseSuccessResult | CsvParseFailureResult;
export interface CsvValueParseSuccessResult {
  ok: true;
  document: ValueDocument;
  diagnostics?: SchemaDiagnostic[];
}
export type CsvValueParseResult =
  CsvValueParseSuccessResult | CsvParseFailureResult;
export declare function tryParseCsvDocument(
  input: string,
  options?: CsvParseOptions,
): CsvParseResult;
export declare function tryParseCsvValueDocument(
  input: string,
  options?: CsvParseOptions,
): CsvValueParseResult;
export declare const tryInferCsvDocument: typeof tryParseCsvDocument;
```

## packages/parsers/csv/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export declare const csvParserCapabilities: ParserCapabilities;
```

## packages/parsers/csv/src/descriptor.d.ts

```ts
import type { ParserDescriptor } from "@schema-transformation-toolkit/core";
export declare const csvParserDescriptor: ParserDescriptor;
```

## packages/parsers/csv/src/index.d.ts

```ts
export {
  tryInferCsvDocument,
  tryParseCsvDocument,
  tryParseCsvValueDocument,
  type CsvParseFailureResult,
  type CsvParseResult,
  type CsvParseSuccessResult,
  type CsvValueParseResult,
  type CsvValueParseSuccessResult,
} from "./api.js";
export { csvParserCapabilities } from "./capabilities.js";
export { csvParserDescriptor } from "./descriptor.js";
export { csvParserOptionCatalog } from "./option-metadata.js";
export type { CsvParseOptions } from "./options.js";
export declare const csvParser: {
  format: string;
  parse(
    input: string,
    options?: import("./options.js").CsvParseOptions,
  ): import("@schema-transformation-toolkit/core").ParseResult<string>;
};
```

## packages/parsers/csv/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const csvParserOptionCatalog: OptionCatalog;
```

## packages/parsers/csv/src/options.d.ts

```ts
import type { ParseOptions } from "@schema-transformation-toolkit/core";
export type CsvParseOptions = ParseOptions;
```
