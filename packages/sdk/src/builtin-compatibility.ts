/** Compatibility helpers for the legacy builtin SDK facade. */
export function defaultDocumentNameForFormat(sourceFormat: string): string {
  if (sourceFormat === "json") return "JsonDocument";
  if (sourceFormat === "json-schema") return "JsonSchemaDocument";
  if (sourceFormat === "typescript") return "TypeScriptDocument";
  return `${sourceFormat.replace(/[^a-zA-Z0-9]+/g, "_")}Document`;
}
