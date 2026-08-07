# API Snapshot: @schema-transformation-toolkit/generator-yaml

Entry: packages/generators/yaml/src/index.ts

## packages/generators/yaml/src/api.d.ts

```ts
import type {
  GenerateResult,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
export type YamlOutput = string;
export declare function generateYaml(document: ValueDocument): YamlOutput;
export declare function tryGenerateYaml(
  document: ValueDocument,
): GenerateResult<YamlOutput>;
```

## packages/generators/yaml/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const yamlGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/yaml/src/descriptor.d.ts

```ts
import {
  type GeneratorDescriptor,
  type ValueDocument,
} from "@schema-transformation-toolkit/core";
export declare const yamlGeneratorDescriptor: GeneratorDescriptor<
  ValueDocument,
  string
>;
```

## packages/generators/yaml/src/index.d.ts

```ts
export { generateYaml, tryGenerateYaml, type YamlOutput } from "./api.js";
export { yamlGeneratorCapabilities } from "./capabilities.js";
export { yamlGeneratorDescriptor } from "./descriptor.js";
export { yamlGeneratorOptionCatalog } from "./option-metadata.js";
```

## packages/generators/yaml/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const yamlGeneratorOptionCatalog: OptionCatalog;
```
