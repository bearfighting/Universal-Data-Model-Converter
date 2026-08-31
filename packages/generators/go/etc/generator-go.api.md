# API Snapshot: @schema-transformation-toolkit/generator-go

Entry: packages/generators/go/src/index.ts

## packages/generators/go/src/analysis.d.ts

```ts
import {
  type ConversionCapabilityRequirement,
  type ConversionLossHotspot,
  type ConstraintDocument,
  type ConversionRouteCapabilities,
  type SchemaDocument,
  type SemanticLoss,
} from "@schema-transformation-toolkit/core";
export declare function collectGoCapabilityRequirements(
  document: SchemaDocument,
): ConversionCapabilityRequirement[];
export declare function collectGoLossHotspots(
  document: SchemaDocument,
): ConversionLossHotspot[];
export declare function planGoSemanticLosses(context: {
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  routeCapabilities: ConversionRouteCapabilities;
  targetFormat: string;
}): SemanticLoss[];
```

## packages/generators/go/src/api.d.ts

```ts
import type {
  ConstraintDocument,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { type GoGenerateResult } from "./failure.js";
import { type GoGeneratorOptions } from "./options.js";
export declare function tryGenerateGo(
  document: SchemaDocument,
  options?: GoGeneratorOptions,
  constraints?: ConstraintDocument,
): GoGenerateResult;
export declare function generateGo(
  document: SchemaDocument,
  options?: GoGeneratorOptions,
  constraints?: ConstraintDocument,
): string;
```

## packages/generators/go/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const goGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/go/src/descriptor.d.ts

```ts
import {
  type GeneratorDescriptor,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { GoGeneratorOptions } from "./options.js";
export declare const goGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  GoGeneratorOptions
>;
```

## packages/generators/go/src/failure.d.ts

```ts
import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
export type GoGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-go-root"
  | "unsupported-go-node"
  | "invalid-go-identifier"
  | "invalid-go-struct-tag"
  | "unsupported-go-union";
export declare class GoGenerationError extends Error {
  readonly code: GoGeneratorFailureCode;
  constructor(code: GoGeneratorFailureCode, message: string);
}
export type GoGenerateFailureResult =
  GenerateFailureResult<GoGeneratorFailureCode>;
export type GoGenerateResult =
  GenerateSuccessResult<string> | GoGenerateFailureResult;
```

## packages/generators/go/src/index.d.ts

```ts
export { goGeneratorCapabilities } from "./capabilities.js";
export {
  collectGoCapabilityRequirements,
  collectGoLossHotspots,
  planGoSemanticLosses,
} from "./analysis.js";
export { goGeneratorDescriptor } from "./descriptor.js";
export { generateGo, tryGenerateGo } from "./api.js";
export type {
  GoGenerateResult,
  GoGenerateFailureResult,
  GoGeneratorFailureCode,
} from "./failure.js";
export { GoGenerationError } from "./failure.js";
export { goGeneratorOptionCatalog } from "./option-metadata.js";
export {
  DEFAULT_GO_GENERATOR_OPTIONS,
  prepareGoGeneratorOptions,
  resolveGoGeneratorOptions,
  validateGoGeneratorOptions,
} from "./options.js";
export type {
  GoGeneratorOptions,
  ResolvedGoGeneratorOptions,
} from "./options.js";
```

## packages/generators/go/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const goGeneratorOptionCatalog: OptionCatalog;
```

## packages/generators/go/src/options.d.ts

```ts
import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface GoGeneratorOptions extends GenerateOptions {
  packageName?: string;
  emitJsonTags?: boolean;
}
export interface ResolvedGoGeneratorOptions {
  packageName: string;
  emitJsonTags: boolean;
}
export declare const DEFAULT_GO_GENERATOR_OPTIONS: ResolvedGoGeneratorOptions;
export declare function resolveGoGeneratorOptions(
  options?: GoGeneratorOptions,
): ResolvedGoGeneratorOptions;
export declare function validateGoGeneratorOptions(
  options: ResolvedGoGeneratorOptions,
): string[];
export declare function prepareGoGeneratorOptions(
  options?: GoGeneratorOptions,
): PreparedOptions<ResolvedGoGeneratorOptions>;
export declare function assertSupportedGoGeneratorOptions(
  options: ResolvedGoGeneratorOptions,
): void;
```
