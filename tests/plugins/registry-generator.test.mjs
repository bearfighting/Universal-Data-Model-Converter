import { describe, expect, it } from "vitest";
import {
  collectEntries,
  normalizeManifest,
  parseArguments,
  renderRegistry,
} from "../../scripts/generate-builtin-registry.mjs";

describe("registry manifest generator", () => {
  it("discovers all workspace component manifests plus the default transformer", async () => {
    const entries = await collectEntries();

    expect(entries).toHaveLength(23);
    expect(entries.filter((entry) => entry.role === "parser")).toHaveLength(11);
    expect(entries.filter((entry) => entry.role === "generator")).toHaveLength(
      11,
    );
    expect(entries.at(-1)).toMatchObject({
      role: "transformer",
      exportName: "valueToShapeTransformer",
    });
  });

  it("renders deterministic output and validates CLI arguments", async () => {
    const entries = await collectEntries();
    expect(renderRegistry(entries)).toBe(renderRegistry([...entries]));
    expect(
      parseArguments(["--manifest", "a.json", "--manifest", "b.json"]),
    ).toEqual({
      check: false,
      manifests: ["a.json", "b.json"],
      output: undefined,
    });
    expect(() => parseArguments(["--unknown"])).toThrow(
      "Unknown registry generator argument",
    );
    expect(() => parseArguments(["--output"])).toThrow(
      "--output requires a path",
    );
  });

  it("rejects invalid manifest roles and versions", () => {
    expect(() =>
      normalizeManifest(
        { version: 2, entries: [] },
        { source: "fixture.manifest.json" },
      ),
    ).toThrow("unsupported registry manifest version");
    expect(() =>
      normalizeManifest(
        { version: 1, entries: [{ role: "unknown", export: "descriptor" }] },
        { source: "fixture.manifest.json" },
      ),
    ).toThrow('invalid registry role "unknown"');
  });
});
