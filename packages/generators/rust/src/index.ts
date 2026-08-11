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
