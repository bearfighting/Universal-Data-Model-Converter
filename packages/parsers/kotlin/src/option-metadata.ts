import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export const kotlinParserOptionCatalog: OptionCatalog = {
  format: "kotlin",
  role: "parser",
  options: [
    {
      key: "entry",
      label: "Root declaration",
      description: "Selects the Kotlin root declaration.",
      category: "selection",
      defaultValue: "the unique root declaration",
      affectedStages: ["parse"],
      semanticEffect:
        "Selects the Shape IR root; other declarations become definitions.",
      diagnosticEffect:
        "Missing, ambiguous, or unknown entries return structured parse failures.",
      supported: true,
      examples: [
        {
          title: "Select User",
          options: { entry: "User" },
          explanation: "Select User as the root declaration.",
        },
      ],
    },
  ],
};
