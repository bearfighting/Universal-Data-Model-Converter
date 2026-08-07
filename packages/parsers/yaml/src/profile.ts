export const yamlProfile = {
  parse: {
    schema: "core",
    version: "1.2",
    uniqueKeys: true,
    merge: false,
    resolveKnownTags: false,
    prettyErrors: true,
  },
  stringify: {
    schema: "core",
    version: "1.2",
    aliasDuplicateObjects: false,
  },
} as const;
