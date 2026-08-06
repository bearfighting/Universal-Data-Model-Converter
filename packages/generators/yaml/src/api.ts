import type {
  GenerateResult,
  ValueDocument,
  ValueNode,
} from "@schema-transformation-toolkit/core";
import { stringify } from "yaml";

export type YamlOutput = string;

const yamlStringifyOptions = {
  schema: "core",
  version: "1.2",
  aliasDuplicateObjects: false,
} as const;

export function generateYaml(document: ValueDocument): YamlOutput {
  const result = tryGenerateYaml(document);
  if (!result.ok) {
    throw new Error(
      `YAML generation failed [${result.code}]: ${result.message}`,
    );
  }
  return result.output;
}

export function tryGenerateYaml(
  document: ValueDocument,
): GenerateResult<YamlOutput> {
  const unsupported = findUnsupportedValue(document.root);
  if (unsupported) {
    return {
      ok: false,
      code: "yaml-non-json-value",
      message: unsupported,
      diagnostics: [
        {
          severity: "error",
          code: "yaml-non-json-value",
          message: unsupported,
          source: "generator-yaml",
        },
      ],
    };
  }

  try {
    return {
      ok: true,
      output: stringify(
        valueNodeToJavaScript(document.root),
        yamlStringifyOptions,
      ),
    };
  } catch (error) {
    const message = `The YAML value could not be serialized: ${errorMessage(error)}`;
    return {
      ok: false,
      code: "yaml-generation-failed",
      message,
      diagnostics: [
        {
          severity: "error",
          code: "yaml-generation-failed",
          message,
          source: "generator-yaml",
        },
      ],
    };
  }
}

function findUnsupportedValue(node: ValueNode): string | undefined {
  if (node.kind === "number" && !Number.isFinite(node.value)) {
    return "The YAML generator only supports finite JSON-compatible numbers.";
  }
  if (node.kind === "array") {
    for (const item of node.items) {
      const failure = findUnsupportedValue(item);
      if (failure) return failure;
    }
  }
  if (node.kind === "object") {
    for (const field of node.fields) {
      const failure = findUnsupportedValue(field.value);
      if (failure) return failure;
    }
  }
  return undefined;
}

function valueNodeToJavaScript(node: ValueNode): unknown {
  if (
    node.kind === "string" ||
    node.kind === "number" ||
    node.kind === "boolean"
  )
    return node.value;
  if (node.kind === "null") return null;
  if (node.kind === "array") return node.items.map(valueNodeToJavaScript);
  return Object.fromEntries(
    node.fields.map((field) => [
      field.name,
      valueNodeToJavaScript(field.value),
    ]),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
