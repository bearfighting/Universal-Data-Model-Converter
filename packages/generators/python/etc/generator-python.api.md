# API Snapshot: @schema-transformation-toolkit/generator-python

Entry: packages/generators/python/src/index.ts

## packages/generators/python/src/api.d.ts

```ts
import type {
  SchemaDocument,
  SchemaGenerator,
} from "@schema-transformation-toolkit/core";
import { type PythonGenerateResult } from "./failure.js";
import { type PythonGeneratorOptions } from "./options.js";
export declare function tryGeneratePython(
  document: SchemaDocument,
  options?: PythonGeneratorOptions,
): PythonGenerateResult;
export declare function generatePython(
  document: SchemaDocument,
  options?: PythonGeneratorOptions,
): string;
export declare function createPythonGenerator(
  options?: PythonGeneratorOptions,
): SchemaGenerator<string, PythonGeneratorOptions>;
export declare const pythonGenerator: SchemaGenerator<
  string,
  import("@schema-transformation-toolkit/core").GenerateOptions,
  import("@schema-transformation-toolkit/core").GenerateResult<string>
>;
```

## packages/generators/python/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";
export declare const pythonGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/python/src/descriptor.d.ts

```ts
import {
  type GeneratorDescriptor,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { PythonGeneratorOptions } from "./options.js";
export declare const pythonGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  PythonGeneratorOptions
>;
```

## packages/generators/python/src/failure.d.ts

```ts
import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";
export type PythonGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-python-root"
  | "unsupported-python-node"
  | "unsupported-python-optional-field"
  | "invalid-python-identifier";
export type PythonGenerateResult =
  | GenerateSuccessResult<string>
  | GenerateFailureResult<PythonGeneratorFailureCode>;
export declare class PythonGenerationError extends Error {
  readonly code: PythonGeneratorFailureCode;
  constructor(code: PythonGeneratorFailureCode, message: string);
}
```

## packages/generators/python/src/index.d.ts

```ts
export { pythonGeneratorCapabilities } from "./capabilities.js";
export { pythonGeneratorDescriptor } from "./descriptor.js";
export {
  generatePython,
  tryGeneratePython,
  createPythonGenerator,
  pythonGenerator,
} from "./api.js";
export type {
  PythonGenerateResult,
  PythonGeneratorFailureCode,
} from "./failure.js";
export { PythonGenerationError } from "./failure.js";
export { pythonGeneratorOptionCatalog } from "./option-metadata.js";
export {
  DEFAULT_PYTHON_GENERATOR_OPTIONS,
  preparePythonGeneratorOptions,
  resolvePythonGeneratorOptions,
  validatePythonGeneratorOptions,
} from "./options.js";
export type {
  PythonGeneratorOptions,
  ResolvedPythonGeneratorOptions,
} from "./options.js";
```

## packages/generators/python/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const pythonGeneratorOptionCatalog: OptionCatalog;
```

## packages/generators/python/src/options.d.ts

```ts
import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export type PythonGeneratorOptions = GenerateOptions;
export type ResolvedPythonGeneratorOptions = Record<string, never>;
export declare const DEFAULT_PYTHON_GENERATOR_OPTIONS: ResolvedPythonGeneratorOptions;
export declare function resolvePythonGeneratorOptions(
  _options?: PythonGeneratorOptions,
): ResolvedPythonGeneratorOptions;
export declare function validatePythonGeneratorOptions(
  _options: ResolvedPythonGeneratorOptions,
): string[];
export declare function preparePythonGeneratorOptions(
  options?: PythonGeneratorOptions,
): PreparedOptions<ResolvedPythonGeneratorOptions>;
```
