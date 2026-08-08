import type {
  GeneratorDescriptor,
  IrTransformerDescriptor,
  ParserDescriptor,
} from "./descriptor-contracts.js";
import type {
  EntryIrKind,
  GeneratorCapabilities,
  IrKind,
  OverlayIrKind,
  ParserCapabilities,
  ValueRootKind,
} from "./contracts.js";

export type DescriptorRegistryErrorCode =
  | "descriptor-invalid-version"
  | "descriptor-format-mismatch"
  | "descriptor-options-mismatch"
  | "descriptor-missing-shape-ir"
  | "descriptor-missing-ir"
  | "descriptor-missing-handler"
  | "descriptor-capability-mismatch"
  | "descriptor-duplicate-format"
  | "descriptor-duplicate-transformer";

export class DescriptorRegistryError extends Error {
  readonly code: DescriptorRegistryErrorCode;

  constructor(code: DescriptorRegistryErrorCode, message: string) {
    super(message);
    this.name = "DescriptorRegistryError";
    this.code = code;
  }
}

export class DescriptorLookupError extends Error {
  readonly code = "descriptor-not-found" as const;

  constructor(role: "parser" | "generator" | "transformer", id: string) {
    super(`No ${role} descriptor is registered for "${id}".`);
    this.name = "DescriptorLookupError";
  }
}

export interface DescriptorRegistry {
  registerParser(descriptor: unknown): void;
  registerGenerator(descriptor: unknown): void;
  registerTransformer(descriptor: unknown): void;
  listParsers(): ParserDescriptor[];
  listGenerators(): GeneratorDescriptor[];
  listTransformers(): IrTransformerDescriptor[];
  parser(format: string): ParserDescriptor;
  generator(format: string): GeneratorDescriptor;
  transformer(id: string): IrTransformerDescriptor;
}

export function createDescriptorRegistry(): DescriptorRegistry {
  const parsers = new Map<string, ParserDescriptor>();
  const generators = new Map<string, GeneratorDescriptor>();
  const transformers = new Map<string, IrTransformerDescriptor>();

  return {
    registerParser(descriptor) {
      validateParserDescriptor(descriptor);
      if (parsers.has(descriptor.format)) {
        throw new DescriptorRegistryError(
          "descriptor-duplicate-format",
          `A parser is already registered for "${descriptor.format}".`,
        );
      }
      parsers.set(descriptor.format, descriptor);
    },
    registerGenerator(descriptor) {
      validateGeneratorDescriptor(descriptor);
      if (generators.has(descriptor.format)) {
        throw new DescriptorRegistryError(
          "descriptor-duplicate-format",
          `A generator is already registered for "${descriptor.format}".`,
        );
      }
      generators.set(descriptor.format, descriptor);
    },
    registerTransformer(descriptor) {
      validateTransformerDescriptor(descriptor);
      if (transformers.has(descriptor.id)) {
        throw new DescriptorRegistryError(
          "descriptor-duplicate-transformer",
          `A transformer is already registered for "${descriptor.id}".`,
        );
      }
      transformers.set(descriptor.id, descriptor);
    },
    listParsers: () => [...parsers.values()].sort(byFormat),
    listGenerators: () => [...generators.values()].sort(byFormat),
    listTransformers: () =>
      [...transformers.values()].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    parser(format) {
      const descriptor = parsers.get(format);
      if (!descriptor) throw new DescriptorLookupError("parser", format);
      return descriptor;
    },
    generator(format) {
      const descriptor = generators.get(format);
      if (!descriptor) throw new DescriptorLookupError("generator", format);
      return descriptor;
    },
    transformer(id) {
      const descriptor = transformers.get(id);
      if (!descriptor) throw new DescriptorLookupError("transformer", id);
      return descriptor;
    },
  };
}

function validateParserDescriptor(
  input: unknown,
): asserts input is ParserDescriptor {
  if (!isRecord(input)) {
    throw new DescriptorRegistryError(
      "descriptor-format-mismatch",
      "Parser descriptor must be an object.",
    );
  }
  if (input.descriptorVersion !== "0.1") {
    throw new DescriptorRegistryError(
      "descriptor-invalid-version",
      `Unsupported parser descriptor version: ${String(input.descriptorVersion)}.`,
    );
  }
  if (
    input.kind !== "parser" ||
    typeof input.format !== "string" ||
    input.format.trim().length === 0
  ) {
    throw new DescriptorRegistryError(
      "descriptor-format-mismatch",
      "Invalid parser descriptor: kind and format are required.",
    );
  }
  if (!isRecord(input.capabilities)) {
    throw new DescriptorRegistryError(
      "descriptor-format-mismatch",
      "Parser descriptor capabilities are required.",
    );
  }
  if (input.capabilities.format !== input.format) {
    throw new DescriptorRegistryError(
      "descriptor-format-mismatch",
      `Parser descriptor format does not match its capabilities: ${input.format}.`,
    );
  }
  validateParserCapabilities(input.capabilities, input.format);
  if (typeof input.parse !== "function") {
    throw new DescriptorRegistryError(
      "descriptor-missing-handler",
      `Parser "${input.format}" must provide parse().`,
    );
  }
  if (!isRecord(input.options)) {
    throw new DescriptorRegistryError(
      "descriptor-options-mismatch",
      `Parser "${input.format}" options metadata must be an object.`,
    );
  }
  if (
    input.options.format !== input.format ||
    input.options.role !== "parser"
  ) {
    throw new DescriptorRegistryError(
      "descriptor-options-mismatch",
      `Parser "${input.format}" options metadata does not match its descriptor.`,
    );
  }
}

function validateGeneratorDescriptor(
  input: unknown,
): asserts input is GeneratorDescriptor {
  if (!isRecord(input)) {
    throw new DescriptorRegistryError(
      "descriptor-format-mismatch",
      "Generator descriptor must be an object.",
    );
  }
  if (input.descriptorVersion !== "0.1") {
    throw new DescriptorRegistryError(
      "descriptor-invalid-version",
      `Unsupported generator descriptor version: ${String(input.descriptorVersion)}.`,
    );
  }
  if (
    input.kind !== "generator" ||
    typeof input.format !== "string" ||
    input.format.trim().length === 0
  ) {
    throw new DescriptorRegistryError(
      "descriptor-format-mismatch",
      "Invalid generator descriptor: kind and format are required.",
    );
  }
  if (!isRecord(input.capabilities)) {
    throw new DescriptorRegistryError(
      "descriptor-format-mismatch",
      "Generator descriptor capabilities are required.",
    );
  }
  if (input.capabilities.target !== input.format) {
    throw new DescriptorRegistryError(
      "descriptor-format-mismatch",
      `Generator descriptor format does not match its capabilities: ${input.format}.`,
    );
  }
  validateGeneratorCapabilities(input.capabilities, input.format);
  if (typeof input.generate !== "function") {
    throw new DescriptorRegistryError(
      "descriptor-missing-handler",
      `Generator "${input.format}" must provide generate().`,
    );
  }
  if (!isRecord(input.options)) {
    throw new DescriptorRegistryError(
      "descriptor-options-mismatch",
      `Generator "${input.format}" options metadata must be an object.`,
    );
  }
  if (
    input.options.format !== input.format ||
    input.options.role !== "generator"
  ) {
    throw new DescriptorRegistryError(
      "descriptor-options-mismatch",
      `Generator "${input.format}" options metadata does not match its descriptor.`,
    );
  }
}

function validateTransformerDescriptor(
  input: unknown,
): asserts input is IrTransformerDescriptor {
  if (
    !isRecord(input) ||
    input.descriptorVersion !== "0.1" ||
    input.kind !== "transformer" ||
    typeof input.id !== "string" ||
    input.id.trim().length === 0 ||
    !isIrKind(input.inputIr) ||
    !isIrKind(input.outputIr) ||
    typeof input.transform !== "function"
  ) {
    throw new DescriptorRegistryError(
      "descriptor-missing-handler",
      "Invalid transformer descriptor.",
    );
  }
  if (input.options !== undefined) {
    if (!isRecord(input.options)) {
      throw new DescriptorRegistryError(
        "descriptor-options-mismatch",
        `Transformer "${input.id}" options metadata must be an object.`,
      );
    }
    if (
      input.options.format !== input.id ||
      input.options.role !== "transformer"
    ) {
      throw new DescriptorRegistryError(
        "descriptor-options-mismatch",
        `Transformer "${input.id}" options metadata does not match its descriptor.`,
      );
    }
  }
}

function validateParserCapabilities(
  input: Record<string, unknown>,
  format: string,
): asserts input is ParserCapabilities & Record<string, unknown> {
  if (
    !Array.isArray(input.producesIr) ||
    input.producesIr.length === 0 ||
    !input.producesIr.every(isIrKind) ||
    !Array.isArray(input.capabilities) ||
    !input.capabilities.every(isConversionCapability)
  ) {
    throw new DescriptorRegistryError(
      "descriptor-missing-ir",
      `Parser "${format}" must declare valid produced IR and capabilities.`,
    );
  }
  if (
    input.valueRootKinds !== undefined &&
    !isValueRootKinds(input.valueRootKinds)
  ) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Parser "${format}" has invalid Value root-shape metadata.`,
    );
  }
  if (input.outputs === undefined) return;
  if (!Array.isArray(input.outputs)) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Parser "${format}" outputs must be an array.`,
    );
  }
  const outputs = input.outputs;
  if (
    outputs.length === 0 ||
    outputs.some(
      (output) =>
        !isRecord(output) ||
        !isIrKind(output.ir) ||
        !isOptionalValueRootKinds(output.valueRootKinds) ||
        !isOptionalIrKinds(output.artifacts),
    ) ||
    !sameIrKinds(
      outputs.map((output) => (output as { ir: IrKind }).ir),
      input.producesIr,
    )
  ) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Parser "${format}" has inconsistent producesIr and outputs fields.`,
    );
  }
  const outputRoots = outputs.find(
    (output) => (output as { ir: IrKind }).ir === "value",
  )?.valueRootKinds;
  if (
    outputRoots &&
    input.valueRootKinds &&
    !sameValueRootKinds(outputRoots, input.valueRootKinds)
  ) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Parser "${format}" has inconsistent Value root-shape fields.`,
    );
  }
}

function validateGeneratorCapabilities(
  input: Record<string, unknown>,
  format: string,
): asserts input is GeneratorCapabilities & Record<string, unknown> {
  if (
    !Array.isArray(input.consumesIr) ||
    input.consumesIr.length === 0 ||
    !input.consumesIr.every(isIrKind) ||
    !Array.isArray(input.supportsCapabilities) ||
    !input.supportsCapabilities.every(isConversionCapability)
  ) {
    throw new DescriptorRegistryError(
      "descriptor-missing-ir",
      `Generator "${format}" must declare valid consumed IR and capabilities.`,
    );
  }
  if (
    input.valueRootKinds !== undefined &&
    !isValueRootKinds(input.valueRootKinds)
  ) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Generator "${format}" has invalid Value root-shape metadata.`,
    );
  }
  const legacyEntryIr = input.consumesIr.filter(
    (ir): ir is EntryIrKind => ir === "value" || ir === "shape",
  );
  const legacyOverlays = input.consumesIr.filter(
    (ir): ir is OverlayIrKind => ir === "constraint",
  );
  const declaredEntries = input.entries;
  if (declaredEntries !== undefined && !Array.isArray(declaredEntries)) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Generator "${format}" entries must be an array.`,
    );
  }
  if (
    Array.isArray(declaredEntries) &&
    declaredEntries.some(
      (entry) =>
        !isRecord(entry) ||
        !isIrKind(entry.ir) ||
        !isOptionalValueRootKinds(entry.valueRootKinds) ||
        !isOptionalIrKinds(entry.artifacts),
    )
  ) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Generator "${format}" has invalid entries.`,
    );
  }
  const entriesIr = Array.isArray(declaredEntries)
    ? declaredEntries.map(
        (entry) => (entry as { ir: IrKind }).ir as EntryIrKind,
      )
    : undefined;
  if (declaredEntries?.some((entry) => entry.ir === "constraint")) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Generator "${format}" cannot use Constraint IR as an entry contract.`,
    );
  }
  if (
    (input.entryIr !== undefined &&
      (!Array.isArray(input.entryIr) ||
        !input.entryIr.every(isEntryIrKind) ||
        !sameIrKinds(input.entryIr, legacyEntryIr))) ||
    (entriesIr && !sameIrKinds(entriesIr, legacyEntryIr)) ||
    (input.overlays !== undefined &&
      (!Array.isArray(input.overlays) ||
        !input.overlays.every(isOverlayIrKind) ||
        !sameIrKinds(input.overlays, legacyOverlays)))
  ) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Generator "${format}" has inconsistent consumesIr and normalized IR capability fields.`,
    );
  }
  const declaredRoots = declaredEntries?.find(
    (entry) => (entry as { ir: IrKind }).ir === "value",
  )?.valueRootKinds;
  if (
    declaredRoots &&
    input.valueRootKinds &&
    !sameValueRootKinds(declaredRoots, input.valueRootKinds)
  ) {
    throw new DescriptorRegistryError(
      "descriptor-capability-mismatch",
      `Generator "${format}" has inconsistent Value root-shape fields.`,
    );
  }
}

function isIrKind(value: unknown): value is IrKind {
  return value === "value" || value === "shape" || value === "constraint";
}

function byFormat(left: { format: string }, right: { format: string }): number {
  return left.format.localeCompare(right.format);
}

function isEntryIrKind(value: unknown): value is EntryIrKind {
  return value === "value" || value === "shape";
}

function isOverlayIrKind(value: unknown): value is OverlayIrKind {
  return value === "constraint";
}

function isValueRootKinds(value: unknown): value is ValueRootKind[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (kind) => kind === "scalar" || kind === "object" || kind === "array",
    )
  );
}

function isOptionalValueRootKinds(value: unknown): boolean {
  return value === undefined || isValueRootKinds(value);
}

function isOptionalIrKinds(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every(isIrKind));
}

function isConversionCapability(value: unknown): boolean {
  return (
    value === "value-ir" ||
    value === "shape-ir" ||
    value === "constraint-ir" ||
    value === "string-constraints" ||
    value === "numeric-constraints" ||
    value === "collection-constraints" ||
    value === "object-constraints" ||
    value === "portable-annotations"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameIrKinds(
  left: readonly IrKind[],
  right: readonly IrKind[],
): boolean {
  return (
    left.length === right.length && left.every((kind) => right.includes(kind))
  );
}

function sameValueRootKinds(
  left: readonly ValueRootKind[],
  right: readonly ValueRootKind[],
): boolean {
  return (
    left.length === right.length && left.every((kind) => right.includes(kind))
  );
}
