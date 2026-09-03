# API Snapshot: @schema-transformation-toolkit/parser-java

Entry: packages/parsers/java/src/index.ts

## packages/parsers/java/src/api.d.ts

```ts
import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { type JavaPosition } from "./failure.js";
import { type JavaParseOptions } from "./options.js";
import type { JavaParseFailureResult } from "./failure.js";
export interface JavaParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  semanticNotes?: import("@schema-transformation-toolkit/core").SchemaSemanticNote[];
}
export type JavaParseResult = JavaParseSuccessResult | JavaParseFailureResult;
export declare function tryParseJava(
  input: string,
  options?: JavaParseOptions,
): JavaParseResult;
export declare function parseJava(
  input: string,
  options?: JavaParseOptions,
): SchemaDocument;
export declare const javaParser: {
  format: "java";
  parse(input: string, options?: JavaParseOptions): JavaParseResult;
};
export declare const preparedJavaParserOptions: import("@schema-transformation-toolkit/core").PreparedOptions<
  import("./options.js").ResolvedJavaParseOptions
>;
export type { JavaPosition };
```

## packages/parsers/java/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export declare const javaParserCapabilities: ParserCapabilities;
```

## packages/parsers/java/src/descriptor.d.ts

```ts
import type {
  ParserDescriptor,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { JavaParseOptions } from "./options.js";
export declare const javaParserDescriptor: ParserDescriptor<
  SchemaDocument,
  JavaParseOptions
>;
```

## packages/parsers/java/src/failure.d.ts

```ts
import type { ParseFailureResult } from "@schema-transformation-toolkit/core";
export interface JavaPosition {
  offset: number;
  line: number;
  column: number;
}
export type JavaParserFailureCode =
  | "invalid-java-syntax"
  | "unsupported-java-feature"
  | "unsupported-java-type"
  | "unsupported-java-generic"
  | "unsupported-java-enum"
  | "unsupported-java-class"
  | "unsupported-java-class-member"
  | "empty-java-enum"
  | "duplicate-java-enum-variant"
  | "duplicate-java-field"
  | "unsupported-java-map-key"
  | "unknown-java-reference"
  | "multiple-java-public-roots"
  | "missing-java-public-root"
  | "invalid-java-entry"
  | "duplicate-java-definition"
  | "invalid-java-data-model"
  | "unsupported-java-parser-v1";
export type JavaParseFailureResult = ParseFailureResult<JavaParserFailureCode>;
export declare class JavaSyntaxError extends Error {
  readonly code: JavaParserFailureCode;
  readonly position?: JavaPosition | undefined;
  constructor(
    code: JavaParserFailureCode,
    message: string,
    position?: JavaPosition | undefined,
  );
}
export declare class JavaSemanticError extends Error {
  readonly code: JavaParserFailureCode;
  readonly position?: JavaPosition | undefined;
  constructor(
    code: JavaParserFailureCode,
    message: string,
    position?: JavaPosition | undefined,
  );
}
```

## packages/parsers/java/src/index.d.ts

```ts
export { javaParserCapabilities } from "./capabilities.js";
export { javaParserDescriptor } from "./descriptor.js";
export {
  parseJava,
  tryParseJava,
  javaParser,
  preparedJavaParserOptions,
} from "./api.js";
export type { JavaParseResult, JavaParseSuccessResult } from "./api.js";
export type {
  JavaParseFailureResult,
  JavaParserFailureCode,
  JavaPosition,
} from "./failure.js";
export { JavaSemanticError, JavaSyntaxError } from "./failure.js";
export { javaParserOptionCatalog } from "./option-metadata.js";
export {
  DEFAULT_JAVA_PARSE_OPTIONS,
  prepareJavaParseOptions,
  resolveJavaParseOptions,
  validateJavaParseOptions,
} from "./options.js";
export type { JavaParseOptions, ResolvedJavaParseOptions } from "./options.js";
```

## packages/parsers/java/src/option-metadata.d.ts

```ts
import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export declare const javaParserOptionCatalog: OptionCatalog;
```

## packages/parsers/java/src/options.d.ts

```ts
import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
export interface JavaParseOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedJavaParseOptions {
  name: string;
  entry?: string;
}
export declare const DEFAULT_JAVA_PARSE_OPTIONS: ResolvedJavaParseOptions;
export declare function resolveJavaParseOptions(
  options?: JavaParseOptions,
): ResolvedJavaParseOptions;
export declare function validateJavaParseOptions(
  options: ResolvedJavaParseOptions,
): string[];
export declare function prepareJavaParseOptions(
  options?: JavaParseOptions,
): PreparedOptions<ResolvedJavaParseOptions>;
export declare function assertSupportedJavaParseOptions(
  options: ResolvedJavaParseOptions,
): void;
```
