import type { OptionCatalog } from "@schema-transformation-toolkit/core";

const example = (
  title: string,
  options: Record<string, unknown>,
  explanation: string,
) => ({ title, options, explanation });

export const rustParserOptionCatalog: OptionCatalog = {
  format: "rust",
  role: "parser",
  options: [
    {
      key: "entry",
      label: "Root struct",
      description:
        "Selects the root struct when the Rust source declares multiple structs.",
      category: "selection",
      defaultValue: "the only struct, when unambiguous",
      affectedStages: ["parse"],
      semanticEffect:
        "Selects the Shape IR root; other structs become definitions.",
      diagnosticEffect:
        "An absent entry or ambiguous source returns a structured parse failure.",
      supported: true,
      examples: [
        example(
          "Select the root struct",
          { entry: "User" },
          "Use an explicit entry when the source declares multiple structs.",
        ),
      ],
    },
  ],
};
