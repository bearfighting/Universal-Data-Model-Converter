import { describe, expect, it } from "vitest";
import {
  createDescriptorRegistry,
  DescriptorLookupError,
  DescriptorRegistryError,
  type GeneratorDescriptor,
  type IrTransformerDescriptor,
  type ParserDescriptor,
} from "../index.js";

const parser = (format: string): ParserDescriptor => ({
  kind: "parser",
  format,
  descriptorVersion: "0.1",
  capabilities: {
    format,
    producesIr: ["value"],
    outputs: [{ ir: "value" }],
    capabilities: ["value-ir"],
  },
  options: { format, role: "parser", options: [] },
  parse: () => ({
    ok: false,
    code: "fixture-failure",
    message: "fixture",
  }),
});

const generator = (format: string): GeneratorDescriptor => ({
  kind: "generator",
  format,
  descriptorVersion: "0.1",
  capabilities: {
    target: format,
    consumesIr: ["value"],
    entries: [{ ir: "value" }],
    supportsCapabilities: ["value-ir"],
  },
  options: { format, role: "generator", options: [] },
  generate: () => ({ ok: true, output: format }),
});

const transformer: IrTransformerDescriptor = {
  kind: "transformer",
  id: "fixture-transformer",
  descriptorVersion: "0.1",
  inputIr: "value",
  outputIr: "shape",
  transform: () => ({
    ok: false,
    code: "fixture-failure",
    message: "fixture",
  }),
};

describe("generic descriptor registry", () => {
  it("allows an empty registry and preserves deterministic registration order", () => {
    const registry = createDescriptorRegistry();
    expect(registry.listParsers()).toEqual([]);
    expect(registry.listGenerators()).toEqual([]);
    expect(registry.listTransformers()).toEqual([]);

    registry.registerParser(parser("zeta"));
    registry.registerParser(parser("alpha"));
    registry.registerGenerator(generator("zeta"));
    registry.registerGenerator(generator("alpha"));
    registry.registerTransformer(transformer);

    expect(registry.listParsers().map((item) => item.format)).toEqual([
      "alpha",
      "zeta",
    ]);
    expect(registry.listGenerators().map((item) => item.format)).toEqual([
      "alpha",
      "zeta",
    ]);
    expect(registry.listTransformers().map((item) => item.id)).toEqual([
      "fixture-transformer",
    ]);
  });

  it("rejects duplicate identities and malformed descriptors structurally", () => {
    const registry = createDescriptorRegistry();
    registry.registerParser(parser("fixture"));
    registry.registerGenerator(generator("fixture"));
    registry.registerTransformer(transformer);

    expect(() => registry.registerParser(parser("fixture"))).toThrowError(
      expect.objectContaining<Partial<DescriptorRegistryError>>({
        code: "descriptor-duplicate-format",
      }),
    );
    expect(() => registry.registerGenerator(generator("fixture"))).toThrowError(
      expect.objectContaining<Partial<DescriptorRegistryError>>({
        code: "descriptor-duplicate-format",
      }),
    );
    expect(() => registry.registerTransformer(transformer)).toThrowError(
      expect.objectContaining<Partial<DescriptorRegistryError>>({
        code: "descriptor-duplicate-transformer",
      }),
    );
    expect(() =>
      registry.registerParser({ ...parser("bad"), parse: undefined as never }),
    ).toThrowError(
      expect.objectContaining<Partial<DescriptorRegistryError>>({
        code: "descriptor-missing-handler",
      }),
    );
    for (const register of [
      (value: unknown) => registry.registerParser(value),
      (value: unknown) => registry.registerGenerator(value),
      (value: unknown) => registry.registerTransformer(value),
    ]) {
      expect(() => register(null)).toThrowError(
        expect.objectContaining({ code: expect.any(String) }),
      );
      expect(() => register(undefined)).toThrowError(
        expect.objectContaining({ code: expect.any(String) }),
      );
      expect(() => register("not-a-descriptor")).toThrowError(
        expect.objectContaining({ code: expect.any(String) }),
      );
    }
  });

  it("returns a typed lookup failure for missing descriptors", () => {
    const registry = createDescriptorRegistry();

    expect(() => registry.parser("missing")).toThrowError(
      expect.objectContaining<Partial<DescriptorLookupError>>({
        code: "descriptor-not-found",
      }),
    );
  });
});
