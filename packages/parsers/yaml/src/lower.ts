import { isMap, isScalar, isSeq } from "yaml";
import type { Node } from "yaml";
import {
  valueDocumentFromJsonCompatible,
  type JsonCompatibleValue,
} from "@schema-transformation-toolkit/core/internal";
import type { ValueDocument } from "@schema-transformation-toolkit/core";

export function lowerYamlDocument(
  name: string,
  node: Node | null | undefined,
): ValueDocument {
  return valueDocumentFromJsonCompatible(name, lowerYamlNode(node));
}

function lowerYamlNode(node: Node | null | undefined): JsonCompatibleValue {
  if (!node) return null;
  if (isScalar(node)) {
    return node.value as JsonCompatibleValue;
  }
  if (isSeq(node)) {
    return node.items.map((item) => lowerYamlNode(item as Node | null));
  }
  if (isMap(node)) {
    const value: Record<string, JsonCompatibleValue> = Object.create(null);
    for (const pair of node.items) {
      const key = pair.key as Node | null;
      value[String(isScalar(key) ? key.value : "")] = lowerYamlNode(
        pair.value as Node | null,
      );
    }
    return value;
  }
  return null;
}
