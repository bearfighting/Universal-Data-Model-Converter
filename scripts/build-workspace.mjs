import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const tsupBin = path.join(repoRoot, "node_modules", ".bin", "tsup");

if (!existsSync(tsupBin)) {
  throw new Error(`tsup executable is missing: ${tsupBin}`);
}

function run(command, args, cwd = repoRoot) {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

function packageDirectories(root) {
  return readdirSync(path.join(repoRoot, root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .filter((relativeDir) =>
      existsSync(path.join(repoRoot, relativeDir, "package.json")),
    )
    .sort();
}

function buildPackage(relativeDir, config) {
  const packageDir = path.join(repoRoot, relativeDir);
  const packageJson = JSON.parse(
    readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );
  console.log(`Building ${packageJson.name} (${relativeDir})`);
  run(tsupBin, ["--config", config], packageDir);
}

buildPackage("packages/core", "../../tsup.core.config.ts");

for (const relativeDir of [
  ...packageDirectories("packages/parsers"),
  ...packageDirectories("packages/generators"),
]) {
  buildPackage(relativeDir, "../../../tsup.config.ts");
}

console.log("Generating builtin registry");
run(process.execPath, ["scripts/generate-builtin-registry.mjs"], repoRoot);
buildPackage("packages/sdk", "../../tsup.config.ts");
