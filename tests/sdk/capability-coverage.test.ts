import { describe, expect, it } from "vitest";
import { jsonSchemaGeneratorCapabilities } from "@schema-transformation-toolkit/generator-json-schema";
import { typeScriptGeneratorCapabilities } from "@schema-transformation-toolkit/generator-typescript";
import { zodGeneratorCapabilities } from "@schema-transformation-toolkit/generator-zod";
import { jsonParserCapabilities } from "@schema-transformation-toolkit/parser-json";
import { jsonSchemaParserCapabilities } from "@schema-transformation-toolkit/parser-json-schema";
import { typeScriptParserCapabilities } from "@schema-transformation-toolkit/parser-typescript";
import { sharedSemanticFixtures } from "../fixtures/semantics/index.js";
import {
  coveredCapabilitiesForSubject,
  missingGeneratorCapabilities,
  missingParserCapabilities,
} from "../helpers/capability-coverage.js";

describe("semantic fixture capability coverage", () => {
  it("tracks currently covered parser capabilities by subject", () => {
    expect(
      coveredCapabilitiesForSubject(sharedSemanticFixtures, "json"),
    ).toEqual(["shape-ir", "value-ir"]);
    expect(
      coveredCapabilitiesForSubject(sharedSemanticFixtures, "json-schema"),
    ).toEqual([
      "collection-constraints",
      "constraint-ir",
      "numeric-constraints",
      "object-constraints",
      "portable-annotations",
      "shape-ir",
      "string-constraints",
    ]);
    expect(
      coveredCapabilitiesForSubject(sharedSemanticFixtures, "typescript"),
    ).toEqual(["shape-ir"]);
  });

  it("tracks currently covered generator capabilities by subject", () => {
    expect(
      coveredCapabilitiesForSubject(
        sharedSemanticFixtures,
        "generator:json-schema",
      ),
    ).toEqual([
      "collection-constraints",
      "constraint-ir",
      "numeric-constraints",
      "object-constraints",
      "portable-annotations",
      "shape-ir",
      "string-constraints",
    ]);
    expect(
      coveredCapabilitiesForSubject(
        sharedSemanticFixtures,
        "generator:typescript",
      ),
    ).toEqual(["shape-ir"]);
    expect(
      coveredCapabilitiesForSubject(sharedSemanticFixtures, "generator:zod"),
    ).toEqual([
      "collection-constraints",
      "constraint-ir",
      "numeric-constraints",
      "object-constraints",
      "portable-annotations",
      "shape-ir",
      "string-constraints",
    ]);
  });

  it("fully covers the currently declared JSON and TypeScript shape/value capabilities", () => {
    expect(
      missingParserCapabilities(sharedSemanticFixtures, jsonParserCapabilities),
    ).toEqual([]);
    expect(
      missingParserCapabilities(
        sharedSemanticFixtures,
        typeScriptParserCapabilities,
      ),
    ).toEqual([]);
    expect(
      missingGeneratorCapabilities(
        sharedSemanticFixtures,
        typeScriptGeneratorCapabilities,
      ),
    ).toEqual([]);
    expect(
      missingGeneratorCapabilities(
        sharedSemanticFixtures,
        zodGeneratorCapabilities,
      ),
    ).toEqual([]);
  });

  it("fully covers the currently declared JSON Schema capabilities after the first constraint fixture wave", () => {
    expect(
      missingParserCapabilities(
        sharedSemanticFixtures,
        jsonSchemaParserCapabilities,
      ),
    ).toEqual([]);

    expect(
      missingGeneratorCapabilities(
        sharedSemanticFixtures,
        jsonSchemaGeneratorCapabilities,
      ),
    ).toEqual([]);
  });
});
