import { describe, expect, it } from "vitest";
import {
  convert,
  describeFormatSupport,
  listConversionRoutes,
} from "@schema-transformation-toolkit/sdk";

describe("SDK Java integration", () => {
  it("discovers Java as a builtin source and target", () => {
    const routes = listConversionRoutes();
    expect(
      routes.some(
        (route) =>
          route.sourceFormat === "java" && route.targetFormat === "typescript",
      ),
    ).toBe(true);
    expect(
      routes.some(
        (route) =>
          route.sourceFormat === "typescript" && route.targetFormat === "java",
      ),
    ).toBe(true);
    expect(describeFormatSupport("java").parser?.producesIr).toEqual(["shape"]);
  });

  it("converts Java records through Shape IR", () => {
    const result = convert({
      sourceFormat: "java",
      targetFormat: "java",
      input: "public record User(long id, String name) {}",
      name: "User",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("public record User(");
    expect(
      result.semanticNotes?.some(
        (note) => note.code === "java-nullability-unspecified",
      ),
    ).toBe(true);
  });

  it("converts Java records to and from another Shape IR format", () => {
    const toTypeScript = convert({
      sourceFormat: "java",
      targetFormat: "typescript",
      input: "public record User(long id, String name) {}",
      name: "User",
    });
    const fromTypeScript = convert({
      sourceFormat: "typescript",
      targetFormat: "java",
      input: "export interface User { id: number; name: string }",
      name: "User",
    });

    expect(toTypeScript.ok).toBe(true);
    expect(fromTypeScript.ok).toBe(true);
    if (fromTypeScript.ok)
      expect(fromTypeScript.output).toContain("public record User(");
  });
});
