export { goParserCapabilities } from "./capabilities.js";
export { goParserDescriptor } from "./descriptor.js";
export {
  parseGo,
  tryParseGo,
  goParser,
  preparedGoParserOptions,
} from "./api.js";
export type { GoParseResult, GoParseSuccessResult } from "./api.js";
export type {
  GoParseFailureResult,
  GoParserFailureCode,
  GoPosition,
} from "./failure.js";
export { GoSyntaxError } from "./failure.js";
export { goParserOptionCatalog } from "./option-metadata.js";
export {
  DEFAULT_GO_PARSE_OPTIONS,
  prepareGoParseOptions,
  resolveGoParseOptions,
  validateGoParseOptions,
} from "./options.js";
export type { GoParseOptions, ResolvedGoParseOptions } from "./options.js";
