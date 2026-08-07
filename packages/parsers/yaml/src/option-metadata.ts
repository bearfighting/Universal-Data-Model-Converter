import type { OptionCatalog } from "@schema-transformation-toolkit/core";

export const yamlParserOptionCatalog: OptionCatalog = {
  format: "yaml",
  role: "parser",
  options: [
    {
      key: "name",
      label: "Document name",
      description: "Sets the root document name used by downstream generators.",
      category: "output",
      defaultValue: "YamlDocument",
      affectedStages: ["parse", "generate"],
      semanticEffect:
        "Does not change the data shape; it changes the generated root declaration name.",
      diagnosticEffect:
        "Invalid names can be rejected by a target generator's naming validation.",
      supported: true,
      examples: [
        {
          title: "Name the generated document",
          options: { name: "Order" },
          explanation: "Use a domain name for generated declarations.",
        },
      ],
    },
  ],
};
