import type { SchemaDefinition } from "@schema-transformation-toolkit/core";

export function definitionNames(document: {
  definitions: Array<{ name: { source: string } }>;
}): string[] {
  return document.definitions.map((definition) => definition.name.source);
}

export function definitionsByName(
  definitions: SchemaDefinition[],
): Map<string, SchemaDefinition> {
  return new Map(
    definitions.map((definition) => [definition.name.source, definition]),
  );
}
