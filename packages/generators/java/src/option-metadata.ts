import type { OptionCatalog } from "@schema-transformation-toolkit/core";

export const javaGeneratorOptionCatalog: OptionCatalog = {
  format: "java",
  role: "generator",
  options: [
    {
      key: "rootVisibility",
      label: "Root visibility",
      description: "Controls whether the generated root record is public.",
      category: "formatting",
      defaultValue: "public",
      affectedStages: ["generate"],
      semanticEffect:
        "Controls the visibility of the single generated root declaration.",
      diagnosticEffect: "Invalid visibility values fail generation.",
      supported: true,
      examples: [
        {
          title: "Package-private output",
          options: { rootVisibility: "package-private" },
          explanation:
            "Generate all top-level records without a public modifier.",
        },
      ],
    },
    {
      key: "packageName",
      label: "Package name",
      description: "Adds a Java package declaration to the generated source.",
      category: "formatting",
      defaultValue: undefined,
      affectedStages: ["generate"],
      semanticEffect:
        "Places generated declarations in the requested Java package.",
      diagnosticEffect: "Invalid package names fail generation.",
      supported: true,
      examples: [
        {
          title: "Java package",
          options: { packageName: "com.example.models" },
          explanation: "Emit a package declaration before imports and records.",
        },
      ],
    },
  ],
};
