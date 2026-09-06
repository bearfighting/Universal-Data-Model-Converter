import { describe, expect, it } from "vitest";
import {
  convert,
  describeFormatSupport,
  listConversionRoutes,
} from "@schema-transformation-toolkit/sdk";

describe("Kotlin SDK support", () => {
  it("registers Kotlin and preserves Set through the direct route", () => {
    const result = convert({
      sourceFormat: "kotlin",
      targetFormat: "kotlin",
      input: "data class User(val id: Int, val tags: Set<String>)",
      includeArtifacts: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("tags: Set<String>");
    expect(result.artifacts?.constraints?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          constraints: [expect.objectContaining({ kind: "unique-items" })],
        }),
      ]),
    );
  });

  it("supports schema routes and exposes the Kotlin capability", () => {
    expect(describeFormatSupport("kotlin").parser?.producesIr).toEqual([
      "shape",
      "constraint",
    ]);
    expect(
      listConversionRoutes().some(
        (route) =>
          route.sourceFormat === "kotlin" &&
          route.targetFormat === "json-schema",
      ),
    ).toBe(true);
    const result = convert({
      sourceFormat: "kotlin",
      targetFormat: "json-schema",
      input: "data class User(val tags: Set<String>)",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toMatchObject({ type: "object" });
  });

  it("supports explicit Kotlin generator options", () => {
    const result = convert({
      sourceFormat: "json-schema",
      targetFormat: "kotlin",
      input: JSON.stringify({
        type: "object",
        title: "User",
        properties: { id: { type: "integer" } },
        required: ["id"],
      }),
      name: "User",
      advanced: {
        parser: { jsonSchema: { entry: "User" } },
        generator: {
          kotlin: {
            declarationStyle: "class",
            propertyStyle: "var",
            packageName: "com.example.models",
          },
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("package com.example.models");
    expect(result.output).toContain("class User");
    expect(result.output).toContain("var id: Long");
  });

  it("reports Set loss when the target cannot preserve collection constraints", () => {
    for (const targetFormat of ["typescript", "java"] as const) {
      const result = convert({
        sourceFormat: "kotlin",
        targetFormat,
        input: "data class User(val tags: Set<String>)",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.losses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "target-cannot-preserve-constraint",
            targetFormat,
          }),
        ]),
      );
    }
  });

  it("converts Java and TypeScript shape inputs into Kotlin", () => {
    const javaResult = convert({
      sourceFormat: "java",
      targetFormat: "kotlin",
      input: "public record User(long id, String name) {}",
    });
    expect(javaResult.ok).toBe(true);
    if (javaResult.ok) expect(javaResult.output).toContain("data class User");

    const typescriptResult = convert({
      sourceFormat: "typescript",
      targetFormat: "kotlin",
      input: "interface User { id: number; name: string }",
    });
    expect(typescriptResult.ok).toBe(true);
    if (typescriptResult.ok)
      expect(typescriptResult.output).toContain("val name: String");
  });

  it("supports direct recursive Kotlin models through the SDK", () => {
    const result = convert({
      sourceFormat: "kotlin",
      targetFormat: "kotlin",
      input: "data class Node(val next: Node?)",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("val next: Node?");
  });
});
