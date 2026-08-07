# API Snapshot: @schema-transformation-toolkit/generator-zod

Entry: packages/generators/zod/src/index.ts

## packages/generators/zod/src/api.d.ts

```ts
import type {
  SchemaDocument,
  SchemaGenerator,
} from "@schema-transformation-toolkit/core";
import type { ZodGenerateResult } from "./failure.js";
import {
  type ConfiguredZodGenerator,
  DEFAULT_ZOD_GENERATOR_OPTIONS,
  type ResolvedZodGeneratorOptions,
  type ZodGeneratorOptions,
} from "./options.js";
export declare function generateZod(
  doc: SchemaDocument,
  options?: ZodGeneratorOptions,
): string;
export declare function tryGenerateZod(
  doc: SchemaDocument,
  options?: ZodGeneratorOptions,
): ZodGenerateResult;
export declare function createZodGenerator(
  options?: ZodGeneratorOptions,
): SchemaGenerator<string, ZodGeneratorOptions, ZodGenerateResult>;
export declare function configureZodGenerator(
  options?: ZodGeneratorOptions,
): ConfiguredZodGenerator;
export declare const zodGenerator: SchemaGenerator<
  string,
  ZodGeneratorOptions,
  ZodGenerateResult
>;
export declare const preparedZodGeneratorOptions: import("@schema-transformation-toolkit/core").PreparedOptions<ResolvedZodGeneratorOptions>;
export { DEFAULT_ZOD_GENERATOR_OPTIONS };
```

## packages/generators/zod/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const zodGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/zod/src/descriptor.d.ts

```ts
import type {
  GeneratorDescriptor,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { ZodGeneratorOptions } from "./options.js";
export declare const zodGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  ZodGeneratorOptions
>;
```

## packages/generators/zod/src/failure.d.ts

```ts
import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
export type ZodGeneratorFailureCode =
  | "invalid-schema-name"
  | "duplicate-rendered-schema-name"
  | "duplicate-rendered-field-name"
  | "invalid-field-name"
  | "invalid-record-key"
  | "invalid-reference-name"
  | "unsupported-node-kind"
  | "unsupported-literal"
  | "invalid-constraint-value";
export type ZodGeneratorFailureResult =
  GenerateFailureResult<ZodGeneratorFailureCode>;
export type ZodGenerateResult =
  GenerateSuccessResult<string> | ZodGeneratorFailureResult;
```

## packages/generators/zod/src/index.d.ts

```ts
export {
  DEFAULT_ZOD_GENERATOR_OPTIONS,
  configureZodGenerator,
  createZodGenerator,
  generateZod,
  preparedZodGeneratorOptions,
  tryGenerateZod,
  zodGenerator,
} from "./api.js";
export { zodGeneratorCapabilities } from "./capabilities.js";
export { zodGeneratorDescriptor } from "./descriptor.js";
export { zodGeneratorOptionCatalog } from "./option-metadata.js";
export {
  prepareZodGeneratorOptions,
  resolveZodGeneratorOptions,
  validateZodGeneratorOptions,
} from "./options.js";
export type {
  ConfiguredZodGenerator,
  ResolvedZodGeneratorOptions,
  ZodGeneratorOptions,
  ZodOutputLanguage,
} from "./options.js";
export type {
  ZodGenerateResult,
  ZodGeneratorFailureCode,
  ZodGeneratorFailureResult,
} from "./failure.js";
```

## packages/generators/zod/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const zodGeneratorOptionCatalog: OptionCatalog;
```

## packages/generators/zod/src/options.d.ts

```ts
import type {
  ConstraintDocument,
  ConfiguredGenerator,
  GenerateOptions,
  NamingStrategy,
  PreparedOptions,
  SchemaGenerator,
} from "@schema-transformation-toolkit/core";
import type { ZodGenerateResult } from "./failure.js";
export type ZodOutputLanguage = "typescript" | "javascript";
export interface ZodGeneratorOptions extends GenerateOptions {
  outputLanguage?: ZodOutputLanguage;
  namingStrategy?: NamingStrategy;
  constraints?: ConstraintDocument;
}
export interface ResolvedZodGeneratorOptions {
  outputLanguage: ZodOutputLanguage;
  namingStrategy: NamingStrategy;
  constraints?: ConstraintDocument;
}
export declare const DEFAULT_ZOD_GENERATOR_OPTIONS: ResolvedZodGeneratorOptions;
export declare function resolveZodGeneratorOptions(
  options?: ZodGeneratorOptions,
): ResolvedZodGeneratorOptions;
export declare function prepareZodGeneratorOptions(
  options?: ZodGeneratorOptions,
): PreparedOptions<ResolvedZodGeneratorOptions>;
export declare function validateZodGeneratorOptions(
  options: ResolvedZodGeneratorOptions,
): string[];
export type ConfiguredZodGenerator = ConfiguredGenerator<
  SchemaGenerator<string, ZodGeneratorOptions, ZodGenerateResult>,
  ResolvedZodGeneratorOptions
>;
```
