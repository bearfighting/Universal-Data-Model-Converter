import type { OptionCatalog } from "@schema-transformation-toolkit/core";

export const javaParserOptionCatalog: OptionCatalog = {
  format: "java",
  role: "parser",
  options: [
    {
      key: "entry",
      label: "Root record",
      description: "Selects the public Java root record.",
      category: "selection",
      defaultValue: "the only public record",
      affectedStages: ["parse"],
      semanticEffect:
        "Selects the Shape IR root; other records become definitions.",
      diagnosticEffect:
        "A missing or non-public entry returns a structured parse failure.",
      supported: true,
      examples: [
        {
          title: "Select User",
          options: { entry: "User" },
          explanation: "Select User as the root record.",
        },
      ],
    },
  ],
};
