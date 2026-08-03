# API Snapshot: @aio/generator-openapi

Entry: packages/generators/openapi/src/index.ts

## packages/generators/openapi/src/api.d.ts

```ts
import type { SchemaDocument } from "@aio/core";
import type { OpenApiGenerateResult } from "./failure.js";
import {
  type ConfiguredOpenApiGenerator,
  DEFAULT_OPENAPI_GENERATOR_OPTIONS,
  type OpenApiGeneratorOptions,
  type OpenApiOutput,
  type ResolvedOpenApiGeneratorOptions,
} from "./options.js";
export declare function generateOpenApi(
  document: SchemaDocument,
  options?: OpenApiGeneratorOptions,
): OpenApiOutput;
export declare function tryGenerateOpenApi(
  document: SchemaDocument,
  options?: OpenApiGeneratorOptions,
): OpenApiGenerateResult;
export declare function createOpenApiGenerator(
  options?: OpenApiGeneratorOptions,
): ConfiguredOpenApiGenerator["generator"];
export declare function configureOpenApiGenerator(
  options?: OpenApiGeneratorOptions,
): ConfiguredOpenApiGenerator;
export declare const openApiGenerator: import("@aio/core").SchemaGenerator<
  OpenApiOutput,
  OpenApiGeneratorOptions,
  OpenApiGenerateResult
>;
export declare const preparedOpenApiGeneratorOptions: import("@aio/core").PreparedOptions<ResolvedOpenApiGeneratorOptions>;
export { DEFAULT_OPENAPI_GENERATOR_OPTIONS };
```

## packages/generators/openapi/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@aio/core";
export declare const openApiGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/openapi/src/descriptor.d.ts

```ts
import type { GeneratorDescriptor } from "@aio/core";
import type { OpenApiOutput } from "./options.js";
export declare const openApiGeneratorDescriptor: GeneratorDescriptor<OpenApiOutput>;
```

## packages/generators/openapi/src/failure.d.ts

```ts
import type { GenerateFailureResult, GenerateSuccessResult } from "@aio/core";
import type { OpenApiOutput } from "./options.js";
export type OpenApiGeneratorFailureCode =
  "openapi-definition-name-conflict" | "openapi-schema-generation-failed";
export type OpenApiGenerateFailureResult =
  GenerateFailureResult<OpenApiGeneratorFailureCode>;
export type OpenApiGenerateResult =
  GenerateSuccessResult<OpenApiOutput> | OpenApiGenerateFailureResult;
```

## packages/generators/openapi/src/index.d.ts

```ts
export {
  DEFAULT_OPENAPI_GENERATOR_OPTIONS,
  configureOpenApiGenerator,
  createOpenApiGenerator,
  generateOpenApi,
  openApiGenerator,
  preparedOpenApiGeneratorOptions,
  tryGenerateOpenApi,
} from "./api.js";
export { openApiGeneratorCapabilities } from "./capabilities.js";
export { openApiGeneratorDescriptor } from "./descriptor.js";
export { openApiGeneratorOptionCatalog } from "./option-metadata.js";
export {
  prepareOpenApiGeneratorOptions,
  resolveOpenApiGeneratorOptions,
  validateOpenApiGeneratorOptions,
} from "./options.js";
export type {
  ConfiguredOpenApiGenerator,
  OpenApiGeneratorOptions,
  OpenApiOutput,
  ResolvedOpenApiGeneratorOptions,
} from "./options.js";
export type {
  OpenApiGenerateFailureResult,
  OpenApiGenerateResult,
  OpenApiGeneratorFailureCode,
} from "./failure.js";
```

## packages/generators/openapi/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@aio/core";
export declare const openApiGeneratorOptionCatalog: OptionCatalog;
```

## packages/generators/openapi/src/options.d.ts

```ts
import type {
  ConfiguredGenerator,
  ConstraintDocument,
  GenerateOptions,
  PreparedOptions,
  SchemaGenerator,
} from "@aio/core";
import type { OpenApiGenerateResult } from "./failure.js";
export type OpenApiOutput = Record<string, unknown>;
export interface OpenApiGeneratorOptions extends GenerateOptions {
  constraints?: ConstraintDocument;
}
export interface ResolvedOpenApiGeneratorOptions {
  constraints?: ConstraintDocument;
}
export declare const DEFAULT_OPENAPI_GENERATOR_OPTIONS: ResolvedOpenApiGeneratorOptions;
export declare function resolveOpenApiGeneratorOptions(
  options?: OpenApiGeneratorOptions,
): ResolvedOpenApiGeneratorOptions;
export declare function prepareOpenApiGeneratorOptions(
  options?: OpenApiGeneratorOptions,
): PreparedOptions<ResolvedOpenApiGeneratorOptions>;
export declare function validateOpenApiGeneratorOptions(
  _options: ResolvedOpenApiGeneratorOptions,
): string[];
export type ConfiguredOpenApiGenerator = ConfiguredGenerator<
  SchemaGenerator<
    OpenApiOutput,
    OpenApiGeneratorOptions,
    OpenApiGenerateResult
  >,
  ResolvedOpenApiGeneratorOptions
>;
```
