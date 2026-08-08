import type {
  GeneratorDescriptor,
  ParserDescriptor,
} from "@schema-transformation-toolkit/core";
import { BUILTIN_FORMAT_CATALOG } from "./builtin-formats.js";
import type { ConvertOptions } from "./types.js";

/**
 * Resolves a builtin component's advanced options from its descriptor format.
 *
 * Format packages already own the option catalog and descriptor identity. The
 * SDK only needs to adapt its backwards-compatible advanced option envelope
 * to the descriptor selected by the route; it must not maintain a second
 * format dispatch table.
 */
export function parserOptionsFor(
  descriptor: ParserDescriptor,
  options: ConvertOptions,
): unknown {
  return resolveComponentOptions(
    descriptor,
    options.advanced?.parser,
    options.extension?.parser,
  );
}

export function generatorOptionsFor(
  descriptor: GeneratorDescriptor,
  options: ConvertOptions,
): unknown {
  return resolveComponentOptions(
    descriptor,
    options.advanced?.generator,
    options.extension?.generator,
  );
}

export function transformerOptionsFor(
  transformerId: string,
  options: ConvertOptions,
): unknown {
  const advanced = options.advanced?.transformer;
  if (advanced && typeof advanced === "object") {
    if (Object.prototype.hasOwnProperty.call(advanced, transformerId)) {
      return advanced[transformerId] ?? {};
    }
  }
  return options.extension?.transformer?.[transformerId] ?? {};
}

function resolveComponentOptions(
  descriptor: ParserDescriptor | GeneratorDescriptor,
  advanced: unknown,
  extension: Record<string, unknown> | undefined,
): unknown {
  if (typeof advanced === "object" && advanced !== null) {
    const optionKey = Object.keys(advanced).find(
      (key) =>
        normalizeOptionKey(key) === normalizeOptionKey(descriptor.format),
    );
    if (optionKey) {
      return (advanced as Record<string, unknown>)[optionKey] ?? {};
    }
  }
  return isBuiltinFormat(descriptor.format) ? {} : (extension ?? {});
}

function normalizeOptionKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function isBuiltinFormat(format: string): boolean {
  return Object.prototype.hasOwnProperty.call(BUILTIN_FORMAT_CATALOG, format);
}
