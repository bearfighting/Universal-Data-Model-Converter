import { describe, expect, it } from "vitest";
import { convert } from "../../packages/sdk/src/index.js";

describe("CSV conversion routes", () => {
  const csv = "id,name\n00123,Ada\n2,Bob\n";

  it("converts CSV to JSON, YAML, TypeScript, and JSON Schema", () => {
    expect(
      convert({ sourceFormat: "csv", targetFormat: "json", input: csv }),
    ).toMatchObject({
      ok: true,
      output: '[{"id":"00123","name":"Ada"},{"id":"2","name":"Bob"}]',
    });

    expect(
      convert({ sourceFormat: "csv", targetFormat: "yaml", input: csv }),
    ).toMatchObject({ ok: true });

    expect(
      convert({ sourceFormat: "csv", targetFormat: "typescript", input: csv }),
    ).toMatchObject({ ok: true });

    const schemaResult = convert({
      sourceFormat: "csv",
      targetFormat: "json-schema",
      input: csv,
      includeArtifacts: true,
    });
    expect(schemaResult).toMatchObject({
      ok: true,
      artifacts: {
        value: { kind: "value-document" },
        shape: { kind: "document" },
      },
    });
  });

  it("converts JSON and YAML row arrays to CSV", () => {
    expect(
      convert({
        sourceFormat: "json",
        targetFormat: "csv",
        input: '[{"id":"1","name":"Ada"}]',
      }),
    ).toMatchObject({ ok: true, output: "id,name\n1,Ada\n" });

    expect(
      convert({
        sourceFormat: "yaml",
        targetFormat: "csv",
        input: "- id: 1\n  name: Ada\n",
      }),
    ).toMatchObject({ ok: true, output: "id,name\n1,Ada\n" });
  });

  it("supports CSV-to-CSV and preserves string cell values on round-trip", () => {
    const generated = convert({
      sourceFormat: "csv",
      targetFormat: "csv",
      input: 'id,note\n00123,"a,b"\n',
    });

    expect(generated).toMatchObject({
      ok: true,
      output: 'id,note\n00123,"a,b"\n',
    });

    const reparsed = convert({
      sourceFormat: "csv",
      targetFormat: "json",
      input:
        generated.ok && typeof generated.output === "string"
          ? generated.output
          : "",
    });
    expect(reparsed).toMatchObject({
      ok: true,
      output: '[{"id":"00123","note":"a,b"}]',
    });
  });

  it("returns structured parse and generate failures", () => {
    expect(
      convert({
        sourceFormat: "csv",
        targetFormat: "json",
        input: "id\n1,2\n",
      }),
    ).toMatchObject({
      ok: false,
      phase: "parse",
      code: "csv-row-width-mismatch",
    });

    expect(
      convert({
        sourceFormat: "json",
        targetFormat: "csv",
        input: '{"id":1}',
      }),
    ).toMatchObject({
      ok: false,
      phase: "generate",
      code: "invalid-generator-input",
    });
  });
});
