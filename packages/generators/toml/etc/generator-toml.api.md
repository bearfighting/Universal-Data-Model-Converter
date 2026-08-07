# API Snapshot: @schema-transformation-toolkit/generator-toml

Entry: packages/generators/toml/src/index.ts

## packages/generators/toml/src/api.d.ts

```ts
import type {
  GenerateResult,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import type { TomlGeneratorOptions } from "./options.js";
export type TomlOutput = string;
export declare function generateToml(
  document: ValueDocument,
  options?: TomlGeneratorOptions,
): TomlOutput;
export declare function tryGenerateToml(
  document: ValueDocument,
  options?: TomlGeneratorOptions,
): GenerateResult<TomlOutput>;
```

## packages/generators/toml/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const tomlGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/toml/src/descriptor.d.ts

```ts
import type { GeneratorDescriptor } from "@schema-transformation-toolkit/core";
export declare const tomlGeneratorDescriptor: GeneratorDescriptor<string>;
```

## packages/generators/toml/src/index.d.ts

```ts
export { generateToml, tryGenerateToml, type TomlOutput } from "./api.js";
export { tomlGeneratorCapabilities } from "./capabilities.js";
export { tomlGeneratorDescriptor } from "./descriptor.js";
export { tomlGeneratorOptionCatalog } from "./option-metadata.js";
export type { TomlGeneratorOptions } from "./options.js";
```

## packages/generators/toml/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const tomlGeneratorOptionCatalog: OptionCatalog;
```

## packages/generators/toml/src/options.d.ts

```ts
export type TomlGeneratorOptions = Record<never, never>;
```
