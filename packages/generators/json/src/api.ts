import type {
  ValueDocument,
  ValueNode,
} from "@schema-transformation-toolkit/core";
import type { GenerateResult } from "@schema-transformation-toolkit/core";

export type JsonOutput = string;

export function generateJson(document: ValueDocument): JsonOutput {
  const result = tryGenerateJson(document);
  if (!result.ok) {
    throw new Error(
      `JSON generation failed [${result.code}]: ${result.message}`,
    );
  }
  return result.output;
}

export function tryGenerateJson(
  document: ValueDocument,
): GenerateResult<JsonOutput> {
  return {
    ok: true,
    output: JSON.stringify(valueNodeToJsonValue(document.root)),
  };
}

function valueNodeToJsonValue(node: ValueNode): unknown {
  if (
    node.kind === "string" ||
    node.kind === "number" ||
    node.kind === "boolean"
  ) {
    return node.value;
  }

  if (node.kind === "null") return null;
  if (node.kind === "array") return node.items.map(valueNodeToJsonValue);

  return Object.fromEntries(
    node.fields.map((field) => [field.name, valueNodeToJsonValue(field.value)]),
  );
}
