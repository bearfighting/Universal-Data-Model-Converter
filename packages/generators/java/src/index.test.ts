import { describe, expect, it } from "vitest";
import {
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaArrayNode,
  schemaRecordNode,
} from "@schema-transformation-toolkit/core";
import { tryGenerateJava } from "./api.js";

describe("Java generator", () => {
  it("generates one public root and package-private definitions with deterministic imports", () => {
    const document = schemaDocument("User", schemaReferenceNode("User"), {
      rootName: "User",
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode(
              "id",
              schemaScalarNode("integer", {
                representation: {
                  family: "integer",
                  signedness: "signed",
                  widthBits: 32,
                },
              }),
            ),
            schemaFieldNode(
              "tags",
              schemaArrayNode(schemaScalarNode("string")),
            ),
            schemaFieldNode(
              "metadata",
              schemaRecordNode(
                schemaScalarNode("string"),
                schemaScalarNode("string"),
              ),
            ),
            schemaFieldNode("profile", schemaReferenceNode("Profile"), {
              nullable: true,
            }),
          ]),
        ),
        schemaDefinition(
          "Profile",
          schemaObjectNode([
            schemaFieldNode("bio", schemaScalarNode("string")),
          ]),
        ),
      ],
    });

    const result = tryGenerateJava(document);
    expect(result).toEqual({
      ok: true,
      output: `import java.util.List;\nimport java.util.Map;\n\npublic record User(\n    int id,\n    List<String> tags,\n    Map<String, String> metadata,\n    Profile profile\n) {}\n\nrecord Profile(\n    String bio\n) {}\n`,
    });
  });

  it("supports package-private root visibility and boxed nullable scalars", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("count", schemaScalarNode("integer"), {
          nullable: true,
        }),
        schemaFieldNode("active", schemaScalarNode("boolean"), {
          nullable: true,
        }),
      ]),
      { rootName: "User" },
    );
    const result = tryGenerateJava(document, {
      rootVisibility: "package-private",
    });
    expect(result).toEqual({
      ok: true,
      output: `record User(\n    Long count,\n    Boolean active\n) {}\n`,
    });
  });

  it("rejects non-object roots", () => {
    const result = tryGenerateJava(
      schemaDocument("Value", schemaScalarNode("string")),
    );
    expect(result).toMatchObject({ ok: false, code: "unsupported-java-root" });
  });

  it("rejects colliding generated definitions", () => {
    const collisionResult = tryGenerateJava(
      schemaDocument(
        "User",
        schemaObjectNode([
          schemaFieldNode(
            "profile",
            schemaObjectNode([
              schemaFieldNode("name", schemaScalarNode("string")),
            ]),
          ),
        ]),
        {
          rootName: "User",
          definitions: [
            schemaDefinition(
              "Userprofile",
              schemaObjectNode([
                schemaFieldNode("id", schemaScalarNode("string")),
              ]),
            ),
          ],
        },
      ),
    );

    expect(collisionResult).toMatchObject({
      ok: false,
      code: "duplicate-java-definition",
    });
  });
});
