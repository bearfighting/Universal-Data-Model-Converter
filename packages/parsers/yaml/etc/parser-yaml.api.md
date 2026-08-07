# API Snapshot: @schema-transformation-toolkit/parser-yaml

Entry: packages/parsers/yaml/src/index.ts

## packages/parsers/yaml/src/api.d.ts

```ts
import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import type { YamlParseOptions } from "./options.js";
export interface YamlParseSuccessResult {
  ok: true;
  value: ValueDocument;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}
export type YamlParseFailureResult = ParseFailureResult<string>;
export type YamlParseResult = YamlParseSuccessResult | YamlParseFailureResult;
export interface YamlValueParseSuccessResult {
  ok: true;
  document: ValueDocument;
  diagnostics?: SchemaDiagnostic[];
}
export type YamlValueParseResult =
  YamlValueParseSuccessResult | YamlParseFailureResult;
export declare function tryParseYamlDocument(
  input: string,
  options?: YamlParseOptions,
): YamlParseResult;
export declare function tryParseYamlValueDocument(
  input: string,
  options?: YamlParseOptions,
): YamlValueParseResult;
export declare const tryInferYamlDocument: typeof tryParseYamlDocument;
```

## packages/parsers/yaml/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export declare const yamlParserCapabilities: ParserCapabilities;
```

## packages/parsers/yaml/src/descriptor.d.ts

```ts
import type {
  IrDocument,
  ParserDescriptor,
} from "@schema-transformation-toolkit/core";
import type { YamlParseOptions } from "./options.js";
export declare const yamlParserDescriptor: ParserDescriptor<
  IrDocument,
  YamlParseOptions
>;
```

## packages/parsers/yaml/src/index.d.ts

```ts
export {
  tryInferYamlDocument,
  tryParseYamlDocument,
  tryParseYamlValueDocument,
  type YamlParseFailureResult,
  type YamlParseResult,
  type YamlParseSuccessResult,
  type YamlValueParseResult,
  type YamlValueParseSuccessResult,
} from "./api.js";
export { yamlParserCapabilities } from "./capabilities.js";
export { yamlParserDescriptor } from "./descriptor.js";
export { yamlParserOptionCatalog } from "./option-metadata.js";
export type { YamlParseOptions } from "./options.js";
export declare const yamlParser: {
  format: string;
  parse(
    input: string,
    options?: import("./options.js").YamlParseOptions,
  ): import("@schema-transformation-toolkit/core").ParseResult<
    import("@schema-transformation-toolkit/core").IrDocument,
    string
  >;
};
```

## packages/parsers/yaml/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const yamlParserOptionCatalog: OptionCatalog;
```

## packages/parsers/yaml/src/options.d.ts

```ts
import type { ParseOptions } from "@schema-transformation-toolkit/core";
export type YamlParseOptions = ParseOptions;
```
