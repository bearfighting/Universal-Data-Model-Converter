export {
  convert,
  createConverter,
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
} from "./convert.js";
export {
  createConversionRegistry,
  defaultConversionRegistry,
  DescriptorRegistrationError,
  resolveGeneratorDescriptor,
  resolveParserDescriptor,
} from "./registry.js";
export type { DescriptorRegistrationErrorCode } from "./registry.js";
export {
  conversionArtifactsSchema,
  conversionCapabilityRequirementSchema,
  conversionEntrySelectionSchema,
  conversionIrPreferenceSchema,
  conversionLossHotspotSchema,
  conversionPolicyDecisionSchema,
  conversionReportSchema,
  conversionRouteSchema,
  conversionSemanticCaveatSchema,
  convertFailureResultSchema,
  convertSuccessResultSchema,
  publicConvertResultSchema,
  schemaDiagnosticSchema,
  semanticLossSchema,
  conversionOptionCatalogsSchema,
  genericConversionOptionCatalogsSchema,
  optionCatalogSchema,
  optionMetadataCategorySchema,
  optionMetadataExampleSchema,
  optionMetadataSchema,
  optionMetadataStageSchema,
  optionValueMetadataSchema,
} from "./public-contract.js";
export {
  conversionIrPreferenceMetadata,
  describeConversionOptions,
  describeGeneratorOptions,
  describeParserOptions,
  listOptionCatalogs,
} from "./options-metadata.js";
export { inspectTypeScriptImplicitEntry } from "./inspect.js";
export { collectUserFacingDiagnostics } from "./ui-diagnostics.js";
export {
  describeFormatSupport,
  listFormatSupports,
  listSourceFormatSupports,
  listTargetFormatSupports,
} from "./support-matrix.js";
export type {
  UserFacingDiagnostic,
  UserFacingSourcePosition,
  UserFacingSourceRange,
} from "./ui-diagnostics.js";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
} from "./inspect.js";
export type {
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  ConversionSourceFormat,
  ConversionTargetFormat,
  BuiltinSourceFormat,
  BuiltinTargetFormat,
  BuiltinGeneratorOutputs,
  ConversionIrPreference,
  ConversionFormat,
  ConversionOutput,
  ConversionRegistry,
  ExtensionConversionOptions,
  GenericConvertAdvancedOptions,
  RegistryConversionOutput,
  RegistryOutputMap,
} from "./convert.js";
export type {
  ConsumerSurfaceFormat,
  FormatSupportSummary,
  GeneratorSupportSummary,
  ParserSupportSummary,
} from "./support-matrix.js";
export type { ConversionOptionCatalogs } from "./options-metadata.js";
