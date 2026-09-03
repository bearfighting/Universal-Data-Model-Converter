import type { OptionCatalog } from "@schema-transformation-toolkit/core";

export const javaGeneratorOptionCatalog: OptionCatalog = {
  format: "java",
  role: "generator",
  options: [
    {
      key: "rootVisibility",
      label: "Root visibility",
      description: "Controls whether the generated root declaration is public.",
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
            "Generate all top-level declarations without a public modifier.",
        },
      ],
    },
    {
      key: "declarationStyle",
      label: "Declaration style",
      description:
        "Controls whether object shapes are generated as records or classes.",
      category: "formatting",
      defaultValue: "record",
      affectedStages: ["generate"],
      semanticEffect:
        "Generates object shapes as immutable records or final classes.",
      diagnosticEffect: "Invalid declaration styles fail generation.",
      supported: true,
      examples: [
        {
          title: "Class output",
          options: { declarationStyle: "class" },
          explanation:
            "Generate final classes with public final fields and a full constructor.",
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
          explanation:
            "Emit a package declaration before imports and declarations.",
        },
      ],
    },
  ],
};
