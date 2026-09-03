# API Snapshot: @schema-transformation-toolkit/generator-java

Entry: packages/generators/java/src/index.ts

## packages/generators/java/src/api.d.ts

```ts
import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { type JavaGenerateResult } from "./failure.js";
import { type JavaGeneratorOptions } from "./options.js";
export declare function tryGenerateJava(
  document: SchemaDocument,
  options?: JavaGeneratorOptions,
): JavaGenerateResult;
export declare function generateJava(
  document: SchemaDocument,
  options?: JavaGeneratorOptions,
): string;
```

## packages/generators/java/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const javaGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/java/src/descriptor.d.ts

```ts
import {
  type GeneratorDescriptor,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { JavaGeneratorOptions } from "./options.js";
export declare const javaGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  JavaGeneratorOptions
>;
```

## packages/generators/java/src/failure.d.ts

```ts
import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
export type JavaGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-java-root"
  | "unsupported-java-node"
  | "invalid-java-identifier"
  | "duplicate-java-definition"
  | "invalid-java-visibility";
export declare class JavaGenerationError extends Error {
  readonly code: JavaGeneratorFailureCode;
  constructor(code: JavaGeneratorFailureCode, message: string);
}
export type JavaGenerateFailureResult =
  GenerateFailureResult<JavaGeneratorFailureCode>;
export type JavaGenerateResult =
  GenerateSuccessResult<string> | JavaGenerateFailureResult;
```

## packages/generators/java/src/index.d.ts

```ts
export { javaGeneratorCapabilities } from "./capabilities.js";
export { javaGeneratorDescriptor } from "./descriptor.js";
export { generateJava, tryGenerateJava } from "./api.js";
export type {
  JavaGenerateResult,
  JavaGenerateFailureResult,
  JavaGeneratorFailureCode,
} from "./failure.js";
export { JavaGenerationError } from "./failure.js";
export { javaGeneratorOptionCatalog } from "./option-metadata.js";
export {
  DEFAULT_JAVA_GENERATOR_OPTIONS,
  prepareJavaGeneratorOptions,
  resolveJavaGeneratorOptions,
  validateJavaGeneratorOptions,
} from "./options.js";
export type {
  JavaGeneratorOptions,
  ResolvedJavaGeneratorOptions,
} from "./options.js";
```

## packages/generators/java/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const javaGeneratorOptionCatalog: OptionCatalog;
```

## packages/generators/java/src/options.d.ts

```ts
import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface JavaGeneratorOptions extends GenerateOptions {
  rootVisibility?: "public" | "package-private";
}
export interface ResolvedJavaGeneratorOptions {
  rootVisibility: "public" | "package-private";
}
export declare const DEFAULT_JAVA_GENERATOR_OPTIONS: ResolvedJavaGeneratorOptions;
export declare function resolveJavaGeneratorOptions(
  options?: JavaGeneratorOptions,
): ResolvedJavaGeneratorOptions;
export declare function validateJavaGeneratorOptions(
  options: ResolvedJavaGeneratorOptions,
): string[];
export declare function prepareJavaGeneratorOptions(
  options?: JavaGeneratorOptions,
): PreparedOptions<ResolvedJavaGeneratorOptions>;
export declare function assertSupportedJavaGeneratorOptions(
  options: ResolvedJavaGeneratorOptions,
): void;
```
