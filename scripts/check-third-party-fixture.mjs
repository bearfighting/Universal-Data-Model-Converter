import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const fixtureDir = path.join(repoRoot, "tests", "fixtures", "third-party");
const tsupBin = path.join(repoRoot, "node_modules", ".bin", "tsup");
const sdkBundle = path.join(repoRoot, "packages", "sdk", "dist", "index.js");
const tempRoot = mkdtempSync(
  path.join(os.tmpdir(), "schema-transformation-toolkit-fixture-"),
);
const generatedRegistrySource = path.join(
  repoRoot,
  "packages",
  "sdk",
  "dist",
  "generated-third-party-registry.ts",
);
const generatedRegistryOutput = path.join(
  repoRoot,
  "packages",
  "sdk",
  "dist",
  "generated-third-party-registry",
);

try {
  if (!existsSync(sdkBundle)) {
    throw new Error(
      "SDK dist is missing. Run node scripts/build-workspace.mjs before the third-party fixture check.",
    );
  }

  execFileSync(tsupBin, ["--config", "../../../tsup.config.ts"], {
    cwd: fixtureDir,
    stdio: "inherit",
  });

  execFileSync(
    process.execPath,
    [
      "scripts/generate-builtin-registry.mjs",
      "--manifest",
      path.relative(repoRoot, path.join(fixtureDir, "registry.json")),
      "--output",
      generatedRegistrySource,
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );

  execFileSync(
    tsupBin,
    [
      generatedRegistrySource,
      "--format",
      "esm",
      "--out-dir",
      generatedRegistryOutput,
      "--no-dts",
      "--external",
      pathToFileURL(path.join(fixtureDir, "dist", "index.js")).href,
      "--external",
      "yaml",
      "--external",
      "typescript",
    ],
    { cwd: path.join(repoRoot, "packages", "sdk"), stdio: "inherit" },
  );

  const sdk = await import(pathToFileURL(sdkBundle).href);
  const generatedRegistry = await import(
    pathToFileURL(
      path.join(generatedRegistryOutput, "generated-third-party-registry.js"),
    ).href
  );
  const registry = generatedRegistry.createBuiltinRegistry();
  const result = sdk.createConverter(registry).convert({
    sourceFormat: "fixture-source",
    targetFormat: "fixture-target",
    input: "fixture",
    irPreference: "shape",
  });

  if (
    !result.ok ||
    result.output !== "fixture:fixture_sourceDocument" ||
    !result.plan.stages.some((stage) => stage.kind === "transform-ir")
  ) {
    throw new Error(
      `Third-party fixture conversion failed: ${JSON.stringify(result)}`,
    );
  }

  console.log("Third-party fixture manifest and conversion smoke passed.");
} finally {
  rmSync(generatedRegistrySource, { force: true });
  rmSync(generatedRegistryOutput, { recursive: true, force: true });
  rmSync(tempRoot, { recursive: true, force: true });
}
