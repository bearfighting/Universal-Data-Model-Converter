# API Snapshot: @schema-transformation-toolkit/generator-kotlin

Entry: packages/generators/kotlin/src/index.ts

## packages/generators/kotlin/src/api.d.ts

```ts
import type {
  ConstraintDocument,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { type KotlinGenerateResult } from "./failure.js";
import { type KotlinGeneratorOptions } from "./options.js";
export declare function tryGenerateKotlin(
  document: SchemaDocument,
  options?: KotlinGeneratorOptions,
  constraints?: ConstraintDocument,
): KotlinGenerateResult;
export declare function generateKotlin(
  document: SchemaDocument,
  options?: KotlinGeneratorOptions,
  constraints?: ConstraintDocument,
): string;
```

## packages/generators/kotlin/src/descriptor.d.ts

```ts
import {
  type GeneratorDescriptor,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { KotlinGeneratorOptions } from "./options.js";
export declare const kotlinGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  KotlinGeneratorOptions
>;
```

## packages/generators/kotlin/src/failure.d.ts

```ts
import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
export type KotlinGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-kotlin-root"
  | "unsupported-kotlin-node"
  | "invalid-kotlin-identifier"
  | "duplicate-kotlin-definition"
  | "unsupported-kotlin-enum"
  | "invalid-kotlin-package"
  | "invalid-kotlin-declaration-style"
  | "invalid-kotlin-property-style"
  | "kotlin-enum-name-collision"
  | "unsupported-kotlin-optional-field"
  | "unsupported-kotlin-empty-object"
  | "unsupported-kotlin-additional-properties"
  | "unsupported-kotlin-representation";
export declare class KotlinGenerationError extends Error {
  readonly code: KotlinGeneratorFailureCode;
  constructor(code: KotlinGeneratorFailureCode, message: string);
}
export type KotlinGenerateFailureResult =
  GenerateFailureResult<KotlinGeneratorFailureCode>;
export type KotlinGenerateResult =
  GenerateSuccessResult<string> | KotlinGenerateFailureResult;
```

## packages/generators/kotlin/src/index.d.ts

```ts
export { kotlinGeneratorDescriptor } from "./descriptor.js";
export { generateKotlin, tryGenerateKotlin } from "./api.js";
export type { KotlinGeneratorOptions } from "./options.js";
export type { KotlinGeneratorFailureCode } from "./failure.js";
```

## packages/generators/kotlin/src/options.d.ts

```ts
import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface KotlinGeneratorOptions extends GenerateOptions {
  packageName?: string;
  declarationStyle?: "data-class" | "class";
  propertyStyle?: "val" | "var";
}
export interface ResolvedKotlinGeneratorOptions {
  packageName?: string;
  declarationStyle: "data-class" | "class";
  propertyStyle: "val" | "var";
}
export declare const DEFAULT_KOTLIN_GENERATOR_OPTIONS: ResolvedKotlinGeneratorOptions;
export declare function resolveKotlinGeneratorOptions(
  options?: KotlinGeneratorOptions,
): ResolvedKotlinGeneratorOptions;
export declare function validateKotlinGeneratorOptions(
  options: ResolvedKotlinGeneratorOptions,
): string[];
export declare function prepareKotlinGeneratorOptions(
  options?: KotlinGeneratorOptions,
): PreparedOptions<ResolvedKotlinGeneratorOptions>;
export declare function assertSupportedKotlinGeneratorOptions(
  options: ResolvedKotlinGeneratorOptions,
): void;
export declare const KOTLIN_KEYWORDS: Set<string>;
export declare function isIdentifier(value: string): boolean;
export declare function kotlinIdentifier(value: string): string;
```
