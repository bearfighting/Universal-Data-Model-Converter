import type {
  OptionCatalog,
  OptionMetadataExample,
} from "@schema-transformation-toolkit/core";

const example = (
  title: string,
  options: Record<string, unknown>,
  explanation: string,
): OptionMetadataExample => ({ title, options, explanation });

export const typeScriptParserOptionCatalog: OptionCatalog = {
  format: "typescript",
  role: "parser",
  options: [
    {
      key: "name",
      label: "Document name",
      description:
        "Sets the root document name used when the parsed declaration is regenerated.",
      category: "output",
      defaultValue: "TypeScriptDocument",
      affectedStages: ["parse", "generate"],
      semanticEffect:
        "Does not change the selected declaration's shape; it controls the shared document name.",
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
      key: "entry",
      label: "Entry declaration",
      description:
        "Selects the exported type or interface used as the document root.",
      category: "selection",
      defaultValue: null,
      affectedStages: ["parse"],
      semanticEffect:
        "Changes which declaration is lowered into the shared Shape IR root.",
      diagnosticEffect:
        "An omitted entry may trigger implicit selection or an ambiguity failure.",
      supported: true,
      examples: [
        example(
          "Select a declaration",
          { entry: "User" },
          "Use an explicit entry when a file contains multiple exported declarations.",
        ),
      ],
    },
    {
      key: "strictness",
      label: "Parser strictness",
      description: "Controls acceptance policy for TypeScript syntax.",
      category: "semantics",
      defaultValue: "strict",
      affectedStages: ["parse"],
      semanticEffect:
        "Strict mode accepts the schema-oriented TypeScript subset only.",
      diagnosticEffect:
        "Unsupported type-level programming constructs fail explicitly.",
      supported: true,
      valueDescriptions: [
        {
          value: "strict",
          label: "Strict",
          description:
            "Reject constructs that cannot map safely to serializable schema semantics.",
          semanticEffect:
            "Avoids lossy approximation of TypeScript-only behavior.",
          example: example(
            "Strict TypeScript parsing",
            { strictness: "strict" },
            "Use for predictable cross-format conversion.",
          ),
        },
      ],
      examples: [
        example(
          "Strict TypeScript parsing",
          { strictness: "strict" },
          "Use for predictable cross-format conversion.",
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
      semanticEffect: "Does not change inferred schema semantics.",
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
