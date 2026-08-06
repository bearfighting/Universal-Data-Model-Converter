import { expect } from "vitest";
import {
  validateSchemaDocument,
  type GeneratorDescriptor,
  type ParserDescriptor,
  type SchemaDocument,
  type ValueDocument,
} from "@schema-transformation-toolkit/core";
import {
  DescriptorRegistrationError,
  type DescriptorRegistrationErrorCode,
} from "../../packages/sdk/src/registry.js";

export interface ParserContractCase {
  input: string;
  name?: string;
  targetFormat?: string;
  expectSuccess?: boolean;
}

export interface GeneratorContractCase {
  document: SchemaDocument | ValueDocument;
  expectSuccess?: boolean;
}

export function expectValidParserDescriptor(
  descriptor: ParserDescriptor,
): void {
  expect(descriptor.kind).toBe("parser");
  expect(descriptor.descriptorVersion).toBe("0.1");
  expect(descriptor.format.length).toBeGreaterThan(0);
  expect(descriptor.capabilities.format).toBe(descriptor.format);
  expect(descriptor.capabilities.producesIr).toContain("shape");
  expect(descriptor.options.format).toBe(descriptor.format);
  expect(descriptor.options.role).toBe("parser");
  expect(descriptor.parse).toEqual(expect.any(Function));
}

export function expectValidGeneratorDescriptor(
  descriptor: GeneratorDescriptor,
): void {
  expect(descriptor.kind).toBe("generator");
  expect(descriptor.descriptorVersion).toBe("0.1");
  expect(descriptor.format.length).toBeGreaterThan(0);
  expect(descriptor.capabilities.target).toBe(descriptor.format);
  expect(descriptor.capabilities.consumesIr.length).toBeGreaterThan(0);
  expect(descriptor.options.format).toBe(descriptor.format);
  expect(descriptor.options.role).toBe("generator");
  expect(descriptor.generate).toEqual(expect.any(Function));
}

export function expectParserDescriptorContract(
  descriptor: ParserDescriptor,
  cases: ParserContractCase[],
): void {
  expectValidParserDescriptor(descriptor);

  for (const testCase of cases) {
    const result = descriptor.parse(testCase.input, {
      name: testCase.name ?? `${descriptor.format}-contract`,
      ...(testCase.targetFormat ? { targetFormat: testCase.targetFormat } : {}),
    });
    const expectedSuccess = testCase.expectSuccess ?? true;
    expect(result.ok).toBe(expectedSuccess);
    if (result.ok) {
      expect(result.document).toBeDefined();
      if (!result.document) continue;
      validateSchemaDocument(result.document);
      if (result.value) {
        expect(descriptor.capabilities.producesIr).toContain("value");
      }
      if (result.constraints) {
        expect(descriptor.capabilities.producesIr).toContain("constraint");
      }
      for (const diagnostic of result.diagnostics ?? []) {
        expect(diagnostic.code.length).toBeGreaterThan(0);
        expect(diagnostic.message.length).toBeGreaterThan(0);
      }
    }
  }
}

export function expectGeneratorDescriptorContract(
  descriptor: GeneratorDescriptor,
  cases: GeneratorContractCase[],
): void {
  expectValidGeneratorDescriptor(descriptor);

  for (const testCase of cases) {
    const first = descriptor.generate(testCase.document, {
      sourceFormat: "descriptor-contract",
    });
    const expectedSuccess = testCase.expectSuccess ?? true;
    expect(first.ok).toBe(expectedSuccess);
    if (first.ok) {
      const second = descriptor.generate(testCase.document, {
        sourceFormat: "descriptor-contract",
      });
      expect(second).toEqual(first);
    }
  }
}

export function expectDescriptorRegistrationFailure(
  register: () => void,
  code: DescriptorRegistrationErrorCode,
): void {
  try {
    register();
    throw new Error("Expected descriptor registration to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(DescriptorRegistrationError);
    expect(error).toMatchObject({ code });
  }
}
