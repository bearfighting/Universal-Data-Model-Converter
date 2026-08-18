import type { OptionCatalog } from "@schema-transformation-toolkit/core";

export const pythonParserOptionCatalog: OptionCatalog = {
  format: "python",
  role: "parser",
  options: [
    {
      key: "entry",
      label: "Root dataclass",
      description:
        "Selects the root dataclass when the source declares multiple dataclasses.",
      category: "selection",
      defaultValue: "the only dataclass, when unambiguous",
      affectedStages: ["parse"],
      semanticEffect:
        "Selects the Shape IR root; referenced dataclasses become definitions.",
      diagnosticEffect:
        "An absent or unknown entry returns a structured parse failure.",
      supported: true,
      examples: [
        {
          title: "Select User",
          options: { entry: "User" },
          explanation:
            "Use an explicit entry when the source declares multiple dataclasses.",
        },
      ],
    },
  ],
};
