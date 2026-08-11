# API Snapshot: @schema-transformation-toolkit/generator-rust

Entry: packages/generators/rust/src/index.ts

## packages/generators/rust/src/api.d.ts

```ts
import type {
  ConstraintDocument,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { type RustGenerateResult } from "./failure.js";
import { type RustGeneratorOptions } from "./options.js";
export declare function tryGenerateRust(
  document: SchemaDocument,
  options?: RustGeneratorOptions,
  constraints?: ConstraintDocument,
): RustGenerateResult;
export declare function generateRust(
  document: SchemaDocument,
  options?: RustGeneratorOptions,
  constraints?: ConstraintDocument,
): string;
```

## packages/generators/rust/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const rustGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/rust/src/descriptor.d.ts

```ts
import {
  type GeneratorDescriptor,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { RustGeneratorOptions } from "./options.js";
export declare const rustGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  RustGeneratorOptions
>;
```

## packages/generators/rust/src/failure.d.ts

```ts
import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
export type RustGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-rust-root"
  | "unsupported-rust-node"
  | "invalid-rust-identifier"
  | "incompatible-rust-representation"
  | "unsupported-rust-integer-range"
  | "unsupported-rust-union"
  | "unsupported-rust-constraint";
export declare class RustGenerationError extends Error {
  readonly code: RustGeneratorFailureCode;
  constructor(code: RustGeneratorFailureCode, message: string);
}
export type RustGenerateFailureResult =
  GenerateFailureResult<RustGeneratorFailureCode>;
export type RustGenerateResult =
  GenerateSuccessResult<string> | RustGenerateFailureResult;
```

## packages/generators/rust/src/index.d.ts

```ts
export { rustGeneratorCapabilities } from "./capabilities.js";
export { rustGeneratorDescriptor } from "./descriptor.js";
export { rustGeneratorOptionCatalog } from "./option-metadata.js";
export { generateRust, tryGenerateRust } from "./api.js";
export type {
  RustGenerateFailureResult,
  RustGenerateResult,
  RustGeneratorFailureCode,
} from "./failure.js";
export { RustGenerationError } from "./failure.js";
export {
  DEFAULT_RUST_GENERATOR_OPTIONS,
  prepareRustGeneratorOptions,
  resolveRustGeneratorOptions,
  validateRustGeneratorOptions,
  type ResolvedRustGeneratorOptions,
  type RustGeneratorOptions,
} from "./options.js";
```

## packages/generators/rust/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const rustGeneratorOptionCatalog: OptionCatalog;
```

## packages/generators/rust/src/options.d.ts

```ts
import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export type RustGeneratorOptions = GenerateOptions;
export type ResolvedRustGeneratorOptions = Record<string, never>;
export declare const DEFAULT_RUST_GENERATOR_OPTIONS: ResolvedRustGeneratorOptions;
export declare function resolveRustGeneratorOptions(
  _options?: RustGeneratorOptions,
): ResolvedRustGeneratorOptions;
export declare function validateRustGeneratorOptions(
  _options: ResolvedRustGeneratorOptions,
): string[];
export declare function prepareRustGeneratorOptions(
  options?: RustGeneratorOptions,
): PreparedOptions<ResolvedRustGeneratorOptions>;
```
