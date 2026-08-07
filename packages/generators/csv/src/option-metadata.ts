import type { OptionCatalog } from "@schema-transformation-toolkit/core";

export const csvGeneratorOptionCatalog: OptionCatalog = {
  format: "csv",
  role: "generator",
  options: [
    {
      key: "columns",
      label: "Empty document columns",
      description:
        "Provides the header columns when generating CSV from an empty array.",
      category: "output",
      defaultValue: [],
      affectedStages: ["generate"],
      semanticEffect:
        "Does not change row values; it supplies the header for an empty Value IR array.",
      diagnosticEffect:
        "Missing or invalid columns fail generation for an empty array.",
      supported: true,
      examples: [
        {
          title: "Generate a header-only CSV",
          options: { columns: ["id", "name"] },
          explanation: "Use columns when the Value IR contains no rows.",
        },
      ],
    },
  ],
};
