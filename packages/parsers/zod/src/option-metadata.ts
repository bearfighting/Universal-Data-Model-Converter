import type { OptionCatalog } from "@schema-transformation-toolkit/core";

export const zodParserOptionCatalog: OptionCatalog = {
  format: "zod",
  role: "parser",
  options: [
    {
      key: "name",
      label: "Document name",
      description: "Sets the shared schema document name.",
      category: "output",
      defaultValue: "ZodDocument",
      affectedStages: ["parse", "generate"],
      semanticEffect:
        "Supplies the document identity used by downstream generators.",
      diagnosticEffect: "Invalid names can be rejected by a target generator.",
      supported: true,
      examples: [
        {
          title: "Name the document",
          options: { name: "User" },
          explanation: "Use a stable domain name for generated output.",
        },
      ],
    },
    {
      key: "entry",
      label: "Schema entry",
      description:
        "Selects a top-level schema binding when implicit selection is ambiguous.",
      category: "selection",
      defaultValue: null,
      affectedStages: ["parse"],
      semanticEffect:
        "Changes which reachable schema binding becomes the document root.",
      diagnosticEffect: "Missing or ambiguous entries fail explicitly.",
      supported: true,
      examples: [
        {
          title: "Select UserSchema",
          options: { entry: "UserSchema" },
          explanation: "Choose a specific exported or local schema binding.",
        },
      ],
    },
  ],
};
