import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export const goParserOptionCatalog: OptionCatalog = {
  format: "go",
  role: "parser",
  options: [
    {
      key: "entry",
      label: "Root type",
      description: "Selects the root Go type when multiple declarations exist.",
      category: "selection",
      defaultValue: "the only declaration, when unambiguous",
      affectedStages: ["parse"],
      semanticEffect:
        "Selects the Shape IR root; other declarations become definitions.",
      diagnosticEffect:
        "An absent entry or ambiguous source returns a structured parse failure.",
      supported: true,
      examples: [
        {
          title: "Select User",
          options: { entry: "User" },
          explanation: "Select User as the root type.",
        },
      ],
    },
  ],
};
