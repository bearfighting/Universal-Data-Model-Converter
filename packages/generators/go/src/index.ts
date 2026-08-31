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
