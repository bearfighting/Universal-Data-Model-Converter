import type {
  OptionCatalog,
  OptionMetadataExample,
} from "@schema-transformation-toolkit/core";

const example = (
  title: string,
  options: Record<string, unknown>,
  explanation: string,
): OptionMetadataExample => ({ title, options, explanation });

export const jsonSchemaParserOptionCatalog: OptionCatalog = {
  format: "json-schema",
  role: "parser",
  options: [
    {
      key: "name",
      label: "Document name",
      description: "Sets the root document name used by downstream generators.",
      category: "output",
      defaultValue: null,
      affectedStages: ["parse", "generate"],
      semanticEffect:
        "Does not change schema meaning; it supplies a stable name for generated declarations.",
      diagnosticEffect: "Invalid names can be rejected by a target generator.",
      supported: true,
      examples: [
        example(
          "Name the generated document",
          { name: "User" },
          "Use a domain name for generated output.",
        ),
      ],
    },
    {
      key: "strictness",
      label: "Parser strictness",
      description: "Controls acceptance policy for JSON Schema input.",
      category: "semantics",
      defaultValue: "strict",
      affectedStages: ["parse"],
      semanticEffect:
        "Strict mode accepts only the currently supported IR-aligned Draft 2020-12 subset.",
      diagnosticEffect:
        "Unsupported features fail explicitly instead of being silently approximated.",
      supported: true,
      valueDescriptions: [
        {
          value: "strict",
          label: "Strict",
          description:
            "Reject JSON Schema features that cannot be represented truthfully.",
          semanticEffect:
            "Protects shared IR semantics from unsupported keywords.",
          example: example(
            "Strict JSON Schema parsing",
            { strictness: "strict" },
            "Use for predictable schema conversion.",
          ),
        },
      ],
      examples: [
        example(
          "Strict JSON Schema parsing",
          { strictness: "strict" },
          "Use for predictable schema conversion.",
        ),
      ],
    },
    {
      key: "diagnostics.preserveSourceInfo",
      label: "Preserve source information",
      description: "Requests source-location evidence for parser diagnostics.",
      category: "diagnostics",
      defaultValue: false,
      affectedStages: ["parse"],
      semanticEffect: "Does not change schema semantics.",
      diagnosticEffect:
        "The true value is not implemented yet and is rejected during option validation.",
      supported: false,
      valueDescriptions: [
        {
          value: false,
          label: "Disabled",
          description: "Use the currently supported diagnostic mode.",
          semanticEffect: "No semantic change.",
          example: example(
            "Default diagnostics",
            { diagnostics: { preserveSourceInfo: false } },
            "Source-location preservation is currently unavailable.",
          ),
        },
      ],
      examples: [
        example(
          "Default diagnostics",
          { diagnostics: { preserveSourceInfo: false } },
          "Source-location preservation is currently unavailable.",
        ),
      ],
    },
  ],
};
