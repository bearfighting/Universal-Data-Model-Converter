import { isAlias, isMap, isScalar, isSeq } from "yaml";
import type { Node } from "yaml";
import { yamlFailure } from "./errors.js";
import type { YamlParseFailureResult } from "./api.js";

export function validateYamlProfile(
  node: Node | null | undefined,
  inMapKey = false,
): YamlParseFailureResult | undefined {
  if (!node) return undefined;

  if (node.tag) {
    return yamlFailure(
      "yaml-unsupported-tag",
      "Explicit YAML tags are outside the strict JSON-compatible YAML profile.",
      node.range,
    );
  }

  if (isAlias(node)) {
    return yamlFailure(
      "yaml-unsupported-alias",
      "YAML aliases are outside the strict JSON-compatible YAML profile.",
      node.range,
    );
  }

  if ("anchor" in node && node.anchor) {
    return yamlFailure(
      "yaml-unsupported-anchor",
      "YAML anchors are outside the strict JSON-compatible YAML profile.",
      node.range,
    );
  }

  if (isMap(node)) {
    for (const pair of node.items) {
      const key = pair.key as Node | null;
      if (isScalar(key) && key.value === "<<") {
        return yamlFailure(
          "yaml-unsupported-merge",
          "YAML merge keys are outside the strict JSON-compatible YAML profile.",
          key.range,
        );
      }
      if (!isScalar(key) || typeof key.value !== "string") {
        return yamlFailure(
          "yaml-non-string-key",
          "YAML mapping keys must be strings.",
          key?.range,
        );
      }

      const keyFailure = validateYamlProfile(key, true);
      if (keyFailure) return keyFailure;
      const valueFailure = validateYamlProfile(
        pair.value as Node | null,
        false,
      );
      if (valueFailure) return valueFailure;
    }
    return undefined;
  }

  if (isSeq(node)) {
    for (const item of node.items) {
      const itemFailure = validateYamlProfile(item as Node | null, false);
      if (itemFailure) return itemFailure;
    }
    return undefined;
  }

  if (inMapKey && typeof node.value !== "string") {
    return yamlFailure(
      "yaml-non-string-key",
      "YAML mapping keys must be strings.",
      node.range,
    );
  }

  if (
    isScalar(node) &&
    node.value !== null &&
    typeof node.value !== "string" &&
    typeof node.value !== "number" &&
    typeof node.value !== "boolean"
  ) {
    return yamlFailure(
      "yaml-non-json-value",
      "The YAML scalar is not JSON-compatible.",
      node.range,
    );
  }

  if (
    isScalar(node) &&
    typeof node.value === "number" &&
    !Number.isFinite(node.value)
  ) {
    return yamlFailure(
      "yaml-non-json-value",
      "The YAML number is not JSON-compatible.",
      node.range,
    );
  }

  return undefined;
}
