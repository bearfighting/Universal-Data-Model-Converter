# API Snapshot: @schema-transformation-toolkit/generator-csv

Entry: packages/generators/csv/src/index.ts

## packages/generators/csv/src/api.d.ts

```ts
import type {
  GenerateResult,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import type { CsvGeneratorOptions } from "./options.js";
export type CsvOutput = string;
export declare function generateCsv(
  document: ValueDocument,
  options?: CsvGeneratorOptions,
): CsvOutput;
export declare function tryGenerateCsv(
  document: ValueDocument,
  options?: CsvGeneratorOptions,
): GenerateResult<CsvOutput>;
```

## packages/generators/csv/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const csvGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/csv/src/descriptor.d.ts

```ts
import type { GeneratorDescriptor } from "@schema-transformation-toolkit/core";
export declare const csvGeneratorDescriptor: GeneratorDescriptor<string>;
```

## packages/generators/csv/src/index.d.ts

```ts
export { generateCsv, tryGenerateCsv, type CsvOutput } from "./api.js";
export { csvGeneratorCapabilities } from "./capabilities.js";
export { csvGeneratorDescriptor } from "./descriptor.js";
export { csvGeneratorOptionCatalog } from "./option-metadata.js";
export type { CsvGeneratorOptions } from "./options.js";
```

## packages/generators/csv/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const csvGeneratorOptionCatalog: OptionCatalog;
```

## packages/generators/csv/src/options.d.ts

```ts
export interface CsvGeneratorOptions {
  columns?: string[];
}
```
