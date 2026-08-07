import { describe, expect, it } from "vitest";
import {
  valueArrayNode,
  valueDocument,
  valueObjectField,
  valueObjectNode,
  valueScalarNode,
} from "@schema-transformation-toolkit/core";
import { generateCsv, tryGenerateCsv } from "./index.js";

describe("CSV generator", () => {
  it("serializes flat object rows and preserves column order", () => {
    const result = tryGenerateCsv(
      valueDocument(
        "Users",
        valueArrayNode([
          valueObjectNode([
            valueObjectField("id", valueScalarNode("00123")),
            valueObjectField("name", valueScalarNode("Ada")),
          ]),
          valueObjectNode([
            valueObjectField("id", valueScalarNode("2")),
            valueObjectField("name", valueScalarNode("Bob")),
          ]),
        ]),
      ),
    );

    expect(result).toEqual({
      ok: true,
      output: "id,name\n00123,Ada\n2,Bob\n",
    });
    expect(
      generateCsv(valueDocument("Users", valueArrayNode([])), {
        columns: ["id", "name"],
      }),
    ).toBe("id,name\n");
  });

  it("quotes special cells and reports scalar textification", () => {
    const result = tryGenerateCsv(
      valueDocument(
        "Rows",
        valueArrayNode([
          valueObjectNode([
            valueObjectField("id", valueScalarNode(1)),
            valueObjectField("active", valueScalarNode(true)),
            valueObjectField("note", valueScalarNode('hello, "Ada"\n')),
          ]),
        ]),
      ),
    );

    expect(result).toMatchObject({
      ok: true,
      output: 'id,active,note\n1,true,"hello, ""Ada""\n"\n',
      semanticNotes: [
        expect.objectContaining({ code: "csv-scalar-textified" }),
      ],
    });
  });

  it.each([
    ["non-array root", valueScalarNode("row"), "invalid-generator-input"],
    [
      "null cell",
      valueArrayNode([
        valueObjectNode([valueObjectField("id", valueScalarNode(null))]),
      ]),
      "csv-unsupported-value",
    ],
    [
      "nested object",
      valueArrayNode([
        valueObjectNode([valueObjectField("row", valueObjectNode([]))]),
      ]),
      "csv-unsupported-value",
    ],
  ])("rejects %s", (_label, root, code) => {
    const result = tryGenerateCsv(valueDocument("Invalid", root));
    expect(result).toMatchObject({ ok: false, code });
  });

  it("rejects inconsistent rows and empty arrays without columns", () => {
    expect(
      tryGenerateCsv(
        valueDocument(
          "Rows",
          valueArrayNode([
            valueObjectNode([valueObjectField("id", valueScalarNode("1"))]),
            valueObjectNode([valueObjectField("name", valueScalarNode("Ada"))]),
          ]),
        ),
      ),
    ).toMatchObject({ ok: false, code: "csv-inconsistent-columns" });

    expect(
      tryGenerateCsv(valueDocument("Rows", valueArrayNode([]))),
    ).toMatchObject({ ok: false, code: "csv-empty-columns" });
  });
});
