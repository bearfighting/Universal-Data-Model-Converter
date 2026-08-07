# API Snapshot: @schema-transformation-toolkit/parser-toml

Entry: packages/parsers/toml/src/index.ts

## packages/parsers/toml/src/api.d.ts

```ts
import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import type { TomlParseOptions } from "./options.js";
export interface TomlParseSuccessResult {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}
export type TomlParseFailureResult = ParseFailureResult<string>;
export type TomlParseResult = TomlParseSuccessResult | TomlParseFailureResult;
export interface TomlValueParseSuccessResult {
  ok: true;
  document: ValueDocument;
  diagnostics?: SchemaDiagnostic[];
}
export type TomlValueParseResult =
  TomlValueParseSuccessResult | TomlParseFailureResult;
export declare function tryParseTomlDocument(
  input: string,
  options?: TomlParseOptions,
): TomlParseResult;
export declare function tryParseTomlValueDocument(
  input: string,
  options?: TomlParseOptions,
): TomlValueParseResult;
export declare const tryInferTomlDocument: typeof tryParseTomlDocument;
```

## packages/parsers/toml/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export declare const tomlParserCapabilities: ParserCapabilities;
```

## packages/parsers/toml/src/descriptor.d.ts

```ts
import type { ParserDescriptor } from "@schema-transformation-toolkit/core";
export declare const tomlParserDescriptor: ParserDescriptor;
```

## packages/parsers/toml/src/index.d.ts

```ts
export {
  tryInferTomlDocument,
  tryParseTomlDocument,
  tryParseTomlValueDocument,
  type TomlParseFailureResult,
  type TomlParseResult,
  type TomlParseSuccessResult,
  type TomlValueParseResult,
  type TomlValueParseSuccessResult,
} from "./api.js";
export { tomlParserCapabilities } from "./capabilities.js";
export { tomlParserDescriptor } from "./descriptor.js";
export { tomlParserOptionCatalog } from "./option-metadata.js";
export type { TomlParseOptions } from "./options.js";
export declare const tomlParser: {
  format: string;
  parse(
    input: string,
    options?: import("./options.js").TomlParseOptions,
  ): import("@schema-transformation-toolkit/core").ParseResult<string>;
};
```

## packages/parsers/toml/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const tomlParserOptionCatalog: OptionCatalog;
```

## packages/parsers/toml/src/options.d.ts

```ts
import type { ParseOptions } from "@schema-transformation-toolkit/core";
export type TomlParseOptions = ParseOptions;
```
