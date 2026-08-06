export {
  tryInferYamlDocument,
  tryParseYamlDocument,
  tryParseYamlValueDocument,
  type YamlParseFailureResult,
  type YamlParseResult,
  type YamlParseSuccessResult,
  type YamlValueParseResult,
  type YamlValueParseSuccessResult,
} from "./api.js";
export { yamlParserCapabilities } from "./capabilities.js";
export { yamlParserDescriptor } from "./descriptor.js";
export { yamlParserOptionCatalog } from "./option-metadata.js";
export type { YamlParseOptions } from "./options.js";

import { yamlParserDescriptor } from "./descriptor.js";

export const yamlParser = {
  format: yamlParserDescriptor.format,
  parse(input: string, options: import("./options.js").YamlParseOptions = {}) {
    return yamlParserDescriptor.parse(input, {
      name: options.name ?? "YamlDocument",
      options,
    });
  },
};
