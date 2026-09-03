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
