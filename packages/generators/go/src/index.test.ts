import { describe, expect, it } from "vitest";
import {
  schemaArrayNode,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaReferenceNode,
  schemaDefinition,
  schemaUnionNode,
  schemaNullNode,
} from "@schema-transformation-toolkit/core";
import { tryGenerateGo } from "./api.js";

describe("Go generator", () => {
  it("generates deterministic structs, tags, containers, and references", () => {
    const user = schemaObjectNode([
      schemaFieldNode(
        "id",
        schemaScalarNode("integer", {
          representation: {
            family: "integer",
            signedness: "signed",
            widthBits: 64,
          },
        }),
      ),
      schemaFieldNode("email", schemaScalarNode("string"), {
        required: false,
        nullable: true,
      }),
      schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
      schemaFieldNode(
        "metadata",
        schemaRecordNode(
          schemaScalarNode("string"),
          schemaScalarNode("string"),
        ),
      ),
      schemaFieldNode("next", schemaReferenceNode("User"), { nullable: true }),
    ]);
    const result = tryGenerateGo(
      schemaDocument("User", schemaReferenceNode("User"), {
        rootName: "User",
        definitions: [schemaDefinition("User", user)],
      }),
    );
    expect(result).toMatchObject({ ok: true });
    if (result.ok)
      expect(result.output).toBe(
        `package models\n\ntype User struct {\n\tID       int64             \`json:"id"\`\n\tEmail    *string           \`json:"email,omitempty"\`\n\tTags     []string          \`json:"tags"\`\n\tMetadata map[string]string \`json:"metadata"\`\n\tNext     *User             \`json:"next"\`\n}\n`,
      );
  });
  it("generates inline objects and rejects general unions", () => {
    const root = schemaObjectNode([
      schemaFieldNode(
        "address",
        schemaObjectNode([schemaFieldNode("city", schemaScalarNode("string"))]),
      ),
    ]);
    expect(
      tryGenerateGo(schemaDocument("User", root, { rootName: "User" })),
    ).toMatchObject({ ok: true });
    const bad = schemaObjectNode([
      schemaFieldNode(
        "value",
        schemaUnionNode([schemaScalarNode("string"), schemaNullNode()]),
      ),
    ]);
    expect(
      tryGenerateGo(schemaDocument("Bad", bad, { rootName: "Bad" })),
    ).toMatchObject({ ok: true });
  });

  it("preserves nested pointers and rejects generated-name collisions", () => {
    const user = schemaObjectNode([
      schemaFieldNode(
        "friends",
        schemaArrayNode(
          schemaUnionNode([schemaReferenceNode("User"), schemaNullNode()]),
        ),
      ),
      schemaFieldNode(
        "items",
        schemaRecordNode(
          schemaScalarNode("string"),
          schemaUnionNode([schemaReferenceNode("User"), schemaNullNode()]),
        ),
      ),
    ]);
    const result = tryGenerateGo(
      schemaDocument("User", schemaReferenceNode("User"), {
        rootName: "User",
        definitions: [schemaDefinition("User", user)],
      }),
    );
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.output).toContain("Friends []*User");
    if (result.ok) expect(result.output).toContain("Items   map[string]*User");

    const collision = schemaObjectNode([
      schemaFieldNode("user-id", schemaScalarNode("string")),
      schemaFieldNode("user_id", schemaScalarNode("string")),
    ]);
    expect(
      tryGenerateGo(
        schemaDocument("Collision", collision, { rootName: "Collision" }),
      ),
    ).toMatchObject({ ok: false, code: "invalid-go-identifier" });
  });

  it("generates named scalar definitions and escaped JSON tags", () => {
    const document = schemaDocument("User", schemaReferenceNode("User"), {
      rootName: "User",
      definitions: [
        schemaDefinition("UserID", schemaScalarNode("integer")),
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode('say"hi', schemaReferenceNode("UserID")),
          ]),
        ),
      ],
    });
    const result = tryGenerateGo(document);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.output).toContain("type UserID int64");
      expect(result.output).toContain('SayHi UserID `json:"say\\"hi"`');
    }
  });

  it("uses pointers for optional fields and accepts exported keyword names", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("name", schemaScalarNode("string"), {
          required: false,
        }),
        schemaFieldNode("type", schemaScalarNode("string")),
      ]),
      { rootName: "User" },
    );
    const result = tryGenerateGo(document);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.output).toContain('Name *string `json:"name,omitempty"`');
      expect(result.output).toMatch(/Type\s+string\s+`json:"type"`/u);
    }
  });

  it("rejects names that cannot produce identifiers or raw tags", () => {
    const invalidName = schemaDocument(
      "User",
      schemaObjectNode([schemaFieldNode("!!!", schemaScalarNode("string"))]),
      { rootName: "User" },
    );
    expect(tryGenerateGo(invalidName)).toMatchObject({
      ok: false,
      code: "invalid-go-identifier",
    });

    const invalidTag = schemaDocument(
      "User",
      schemaObjectNode([schemaFieldNode("a`b", schemaScalarNode("string"))]),
      { rootName: "User" },
    );
    expect(tryGenerateGo(invalidTag)).toMatchObject({
      ok: false,
      code: "invalid-go-struct-tag",
    });
  });
});
