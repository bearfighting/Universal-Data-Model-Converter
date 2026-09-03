import { describe, expect, it } from "vitest";
import { convert } from "@schema-transformation-toolkit/sdk";

const goUser = "package models\ntype User struct { ID int64 }";

describe("SDK Go integration", () => {
  it("converts Go through Shape IR without an undeclared empty Constraint IR", () => {
    const result = convert({
      sourceFormat: "go",
      targetFormat: "go",
      input: goUser,
      name: "User",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("type User struct");
    expect(result.artifacts?.constraints).toBeUndefined();
  });

  it("converts Go Shape IR to TypeScript", () => {
    const result = convert({
      sourceFormat: "go",
      targetFormat: "typescript",
      input: goUser,
      name: "User",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("id");
  });
});
