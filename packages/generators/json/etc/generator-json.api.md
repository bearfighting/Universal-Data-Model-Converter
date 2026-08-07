# API Snapshot: @schema-transformation-toolkit/generator-json

Entry: packages/generators/json/src/index.ts

## packages/generators/json/src/api.d.ts

```ts
import type { ValueDocument } from "@schema-transformation-toolkit/core";
import type { GenerateResult } from "@schema-transformation-toolkit/core";
export type JsonOutput = string;
export declare function generateJson(document: ValueDocument): JsonOutput;
export declare function tryGenerateJson(
  document: ValueDocument,
): GenerateResult<JsonOutput>;
```

## packages/generators/json/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const jsonGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/json/src/descriptor.d.ts

```ts
import type {
  GeneratorDescriptor,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
export declare const jsonGeneratorDescriptor: GeneratorDescriptor<
  ValueDocument,
  string
>;
```

## packages/generators/json/src/index.d.ts

```ts
export { generateJson, tryGenerateJson } from "./api.js";
export type { JsonOutput } from "./api.js";
export { jsonGeneratorCapabilities } from "./capabilities.js";
export { jsonGeneratorDescriptor } from "./descriptor.js";
export { jsonGeneratorOptionCatalog } from "./option-metadata.js";
```

## packages/generators/json/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const jsonGeneratorOptionCatalog: OptionCatalog;
```
