export {
  tryInferTomlDocument,
  tryParseTomlDocument,
  tryParseTomlValueDocument,
  type TomlParseFailureResult,
  type TomlParseResult,
  type TomlParseSuccessResult,
  type TomlValueParseResult,
  type TomlValueParseSuccessResult,
} from "./api.js";
export { tomlParserCapabilities } from "./capabilities.js";
export { tomlParserDescriptor } from "./descriptor.js";
export { tomlParserOptionCatalog } from "./option-metadata.js";
export type { TomlParseOptions } from "./options.js";

import { tomlParserDescriptor } from "./descriptor.js";

export const tomlParser = {
  format: tomlParserDescriptor.format,
  parse(input: string, options: import("./options.js").TomlParseOptions = {}) {
    return tomlParserDescriptor.parse(input, {
      name: options.name ?? "TomlDocument",
      options,
    });
  },
};
