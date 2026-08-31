import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export const goGeneratorOptionCatalog: OptionCatalog = {
  format: "go",
  role: "generator",
  options: [
    {
      key: "packageName",
      label: "Package name",
      description: "Sets the generated Go package declaration.",
      category: "formatting",
      defaultValue: "models",
      affectedStages: ["generate"],
      semanticEffect: "Changes the generated package declaration.",
      diagnosticEffect: "Invalid Go package identifiers fail generation.",
      supported: true,
      examples: [
        {
          title: "Use models",
          options: { packageName: "models" },
          explanation: "Generate declarations in the models package.",
        },
      ],
    },
    {
      key: "emitJsonTags",
      label: "Emit JSON tags",
      description: "Emits json struct tags on generated fields.",
      category: "formatting",
      defaultValue: true,
      affectedStages: ["generate"],
      semanticEffect:
        "Preserves schema field names in JSON serialization tags.",
      diagnosticEffect:
        "When disabled, JSON field-name metadata is not emitted.",
      supported: true,
      examples: [
        {
          title: "Emit tags",
          options: { emitJsonTags: true },
          explanation: "Keep JSON field names in generated struct tags.",
        },
      ],
    },
  ],
};
