import { describe, expect, it } from "vitest";
import { tryGenerateZod } from "@schema-transformation-toolkit/generator-zod";
import { sharedSemanticFixtures } from "../../fixtures/semantics/index.js";
import {
  expectDiagnosticCodes,
  expectSemanticNoteCodes,
} from "../../helpers/diagnostic-assertions.js";
import { expectValidJavaScriptModule } from "../../helpers/javascript-syntax.js";
import {
  getFixtureConstraints,
  getFixtureDocument,
} from "../../helpers/generator-contract.js";
import { expectValidTypeScriptSyntax } from "../../helpers/typescript-syntax.js";
import { expectGeneratedZodRuntimeBehavior } from "../../helpers/zod-runtime.js";

describe("generator-zod contract", () => {
  for (const fixture of sharedSemanticFixtures) {
    it(`renders valid Zod TypeScript and JavaScript for ${fixture.id}`, async () => {
      const expectation = fixture.generatorExpectations?.["generator:zod"];
      const constraints = getFixtureConstraints(fixture);

      const typeScriptResult = tryGenerateZod(
        getFixtureDocument(fixture),
        constraints
          ? { outputLanguage: "typescript", constraints }
          : { outputLanguage: "typescript" },
      );
      const javaScriptResult = tryGenerateZod(
        getFixtureDocument(fixture),
        constraints
          ? { outputLanguage: "javascript", constraints }
          : { outputLanguage: "javascript" },
      );

      expect(typeScriptResult.ok).toBe(true);
      expect(javaScriptResult.ok).toBe(true);

      if (!typeScriptResult.ok || !javaScriptResult.ok) return;

      expect(typeScriptResult.output).toContain("export const");
      expect(javaScriptResult.output).toContain("export const");
      expectValidTypeScriptSyntax(typeScriptResult.output, `${fixture.id}.ts`);
      expectValidJavaScriptModule(javaScriptResult.output, `${fixture.id}.mjs`);
      expectDiagnosticCodes(
        typeScriptResult.diagnostics,
        expectation?.diagnosticCodes ?? [],
      );
      expectDiagnosticCodes(
        javaScriptResult.diagnostics,
        expectation?.diagnosticCodes ?? [],
      );
      expectSemanticNoteCodes(
        typeScriptResult.semanticNotes,
        expectation?.semanticNoteCodes ?? [],
      );
      expectSemanticNoteCodes(
        javaScriptResult.semanticNotes,
        expectation?.semanticNoteCodes ?? [],
      );
    });
  }

  for (const fixture of sharedSemanticFixtures.filter(
    (candidate) => candidate.validationExamples !== undefined,
  )) {
    it(`executes valid and invalid Zod inputs for ${fixture.id}`, async () => {
      const examples = fixture.validationExamples;
      expect(examples).toBeDefined();
      if (!examples) return;

      const constraints = getFixtureConstraints(fixture);
      const result = tryGenerateZod(
        getFixtureDocument(fixture),
        constraints
          ? { outputLanguage: "javascript", constraints }
          : { outputLanguage: "javascript" },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      await expectGeneratedZodRuntimeBehavior(
        result.output,
        getFixtureDocument(fixture).name.source,
        examples,
        "javascript",
      );
    });
  }

  it("executes TypeScript output through the same Zod runtime contract", async () => {
    const fixture = sharedSemanticFixtures.find(
      (candidate) => candidate.id === "reference.recursive-reference",
    );
    expect(fixture).toBeDefined();
    if (!fixture || !fixture.validationExamples) return;

    const result = tryGenerateZod(getFixtureDocument(fixture), {
      outputLanguage: "typescript",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await expectGeneratedZodRuntimeBehavior(
      result.output,
      getFixtureDocument(fixture).name.source,
      fixture.validationExamples,
      "typescript",
    );
  });
});
