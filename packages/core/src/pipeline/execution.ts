import type {
  GenerateResult,
  GeneratorDescriptor,
  GeneratorExecutionContext,
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
} from "./descriptor-contracts.js";
import type {
  GeneratorCapabilities,
  IrBundle,
  IrDocument,
  IrKind,
  ParserCapabilities,
} from "./contracts.js";
import { tryValidateIrBundle } from "./validation.js";

export function executeParser<TDocument extends IrDocument, TOptions>(
  descriptor: ParserDescriptor<TDocument, TOptions>,
  input: string,
  context: ParserExecutionContext<TOptions>,
): ParseResult<TDocument> {
  let result: ParseResult<TDocument>;
  try {
    result = descriptor.parse(input, context);
  } catch {
    return parserFailure(
      "parser-descriptor-failed",
      `Parser "${descriptor.format}" failed while producing its result.`,
    );
  }
  if (!result.ok) return result;

  const bundle: IrBundle<TDocument> = {
    document: result.document,
    ...(result.artifacts ? { artifacts: result.artifacts } : {}),
  };
  const validation = tryValidateIrBundle(bundle);
  if (!validation.ok) {
    return parserFailure(
      validation.diagnostics[0]?.code ?? "invalid-parser-result",
      validation.diagnostics[0]?.message ?? "The parser produced invalid IR.",
    );
  }

  const capabilityFailure = validateParserOutput(
    descriptor.capabilities,
    bundle,
  );
  return capabilityFailure ?? result;
}

export function executeGenerator<TInput extends IrDocument, TOutput, TOptions>(
  descriptor: GeneratorDescriptor<TInput, TOutput, TOptions>,
  input: IrBundle<TInput>,
  context: GeneratorExecutionContext<TOptions>,
): GenerateResult<TOutput> {
  const validation = tryValidateIrBundle(input);
  if (!validation.ok) {
    return generatorFailure(
      "invalid-generator-input",
      validation.diagnostics[0]?.message ?? "The generator input is invalid.",
    );
  }

  const capabilityFailure = validateGeneratorInput(
    descriptor.capabilities,
    input,
  );
  if (capabilityFailure) return capabilityFailure;

  try {
    return descriptor.generate(input, context);
  } catch {
    return generatorFailure(
      "invalid-generator-input",
      `Generator "${descriptor.format}" failed while processing its IR input.`,
    );
  }
}

function validateParserOutput(
  capabilities: ParserCapabilities,
  bundle: IrBundle,
): ParseResult<never> | undefined {
  const documents: Array<[IrKind, IrDocument | undefined]> = [
    [documentIrKind(bundle.document), bundle.document],
    ["value", bundle.artifacts?.value],
    ["shape", bundle.artifacts?.shape],
    ["constraint", bundle.artifacts?.constraints],
  ];
  for (const [kind, document] of documents) {
    if (document && !capabilities.producesIr.includes(kind)) {
      return parserFailure(
        "parser-capability-mismatch",
        `Parser "${capabilities.format}" produced undeclared ${kind} IR.`,
      );
    }
  }
  return undefined;
}

function validateGeneratorInput(
  capabilities: GeneratorCapabilities,
  input: IrBundle,
): GenerateResult<never> | undefined {
  const kind = documentIrKind(input.document);
  const entries =
    capabilities.entries?.map((entry) => entry.ir) ??
    capabilities.entryIr ??
    capabilities.consumesIr.filter(
      (item): item is Exclude<IrKind, "constraint"> =>
        item === "value" || item === "shape",
    );
  if (!entries.includes(kind as Exclude<IrKind, "constraint">)) {
    return generatorFailure(
      "invalid-generator-input",
      `Generator "${capabilities.target}" does not accept ${kind} IR as its primary input.`,
    );
  }

  return undefined;
}

function documentIrKind(document: IrDocument): IrKind {
  if (document.kind === "value-document") return "value";
  if (document.kind === "document") return "shape";
  return "constraint";
}

function parserFailure<TCode extends string>(
  code: TCode,
  message: string,
): ParseResult<never, TCode> {
  return { ok: false, code, message };
}

function generatorFailure<TCode extends string>(
  code: TCode,
  message: string,
): GenerateResult<never, TCode> {
  return { ok: false, code, message };
}
