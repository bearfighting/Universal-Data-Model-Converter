import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const tempRoot = mkdtempSync(
  path.join(os.tmpdir(), "schema-transformation-toolkit-sdk-package-"),
);

try {
  execFileSync(
    "pnpm",
    ["--filter", "@schema-transformation-toolkit/sdk", "build"],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );

  const sdkBundle = readFileSync(
    path.join(repoRoot, "packages/sdk/dist/index.js"),
    "utf8",
  );
  if (
    sdkBundle.includes("Dynamic require of ") ||
    sdkBundle.includes("var __require")
  ) {
    throw new Error(
      "The SDK ESM bundle must not inline yaml's dynamic Node require compatibility code.",
    );
  }

  const packOutput = execFileSync(
    "pnpm",
    ["pack", "--pack-destination", tempRoot],
    {
      cwd: path.join(repoRoot, "packages/sdk"),
      encoding: "utf8",
    },
  );
  const tarballName = packOutput
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".tgz"))
    .at(-1);

  if (!tarballName) {
    throw new Error("pnpm pack did not report an SDK tarball.");
  }

  const tarballPath = path.join(tempRoot, path.basename(tarballName));
  const packedPackageJson = JSON.parse(
    execFileSync("tar", ["-xOf", tarballPath, "package/package.json"], {
      encoding: "utf8",
    }),
  );
  const workspaceDependencies = Object.entries(
    packedPackageJson.dependencies ?? {},
  ).filter(
    ([, version]) =>
      version === "workspace:*" || version.startsWith("workspace:"),
  );
  if (workspaceDependencies.length > 0) {
    throw new Error(
      `Packed SDK still contains workspace dependencies: ${workspaceDependencies
        .map(([name]) => name)
        .join(", ")}`,
    );
  }

  writeFileSync(
    path.join(tempRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "schema-transformation-toolkit-sdk-package-smoke",
        private: true,
        type: "module",
        dependencies: {
          "@schema-transformation-toolkit/sdk": `file:${tarballPath}`,
        },
      },
      null,
      2,
    )}\n`,
  );

  const workspaceOverrideNames = [
    "@schema-transformation-toolkit/core",
    "@schema-transformation-toolkit/generator-csv",
    "@schema-transformation-toolkit/generator-json",
    "@schema-transformation-toolkit/generator-json-schema",
    "@schema-transformation-toolkit/generator-openapi",
    "@schema-transformation-toolkit/generator-rust",
    "@schema-transformation-toolkit/generator-python",
    "@schema-transformation-toolkit/generator-go",
    "@schema-transformation-toolkit/generator-java",
    "@schema-transformation-toolkit/generator-toml",
    "@schema-transformation-toolkit/generator-typescript",
    "@schema-transformation-toolkit/generator-zod",
    "@schema-transformation-toolkit/generator-yaml",
    "@schema-transformation-toolkit/parser-csv",
    "@schema-transformation-toolkit/parser-json",
    "@schema-transformation-toolkit/parser-json-schema",
    "@schema-transformation-toolkit/parser-openapi",
    "@schema-transformation-toolkit/parser-rust",
    "@schema-transformation-toolkit/parser-python",
    "@schema-transformation-toolkit/parser-go",
    "@schema-transformation-toolkit/parser-java",
    "@schema-transformation-toolkit/parser-toml",
    "@schema-transformation-toolkit/parser-typescript",
    "@schema-transformation-toolkit/parser-zod",
    "@schema-transformation-toolkit/parser-yaml",
  ];
  const workspaceOverrides = workspaceOverrideNames
    .map((name) => {
      const localPackage = `file:${path.join(
        repoRoot,
        "packages",
        packageDirectoryFor(name),
      )}`;
      return `  ${JSON.stringify(name)}: ${JSON.stringify(localPackage)}`;
    })
    .join("\n");
  writeFileSync(
    path.join(tempRoot, "pnpm-workspace.yaml"),
    `packages:\n  - "."\n\noverrides:\n${workspaceOverrides}\n`,
  );

  execFileSync("pnpm", ["install", "--ignore-scripts", "--lockfile=false"], {
    cwd: tempRoot,
    stdio: "inherit",
  });

  const tomlSmokeInput = JSON.stringify('id = 1\nname = "Ada"\n');
  const smokeScript = `
    import {
      convert,
      listSourceFormatSupports,
      listTargetFormatSupports,
    } from "@schema-transformation-toolkit/sdk";

    const sources = listSourceFormatSupports()
      .map((item) => item.format)
      .sort();
    const targets = listTargetFormatSupports()
      .map((item) => item.format)
      .sort();
    if (sources.join(",") !== "csv,go,java,json,json-schema,openapi,python,rust,toml,typescript,yaml,zod") {
      throw new Error("Unexpected source formats: " + sources.join(","));
    }
    if (targets.join(",") !== "csv,go,java,json,json-schema,openapi,python,rust,toml,typescript,yaml,zod") {
      throw new Error("Unexpected target formats: " + targets.join(","));
    }

    const cases = [
      { sourceFormat: "json", targetFormat: "typescript", input: "{\\"id\\":1}" },
      { sourceFormat: "json-schema", targetFormat: "zod", input: JSON.stringify({ type: "object", properties: { id: { type: "integer" } } }) },
      { sourceFormat: "typescript", targetFormat: "json-schema", input: "export interface User { id: number }" },
      { sourceFormat: "openapi", targetFormat: "openapi", input: JSON.stringify({ openapi: "3.1.0", info: { title: "Smoke", version: "1.0.0" }, paths: {}, components: { schemas: { User: { type: "object" } } } }) },
      { sourceFormat: "yaml", targetFormat: "typescript", input: "id: 1\\nname: Ada\\n" },
      { sourceFormat: "json", targetFormat: "yaml", input: "{\\"id\\":1}" },
      { sourceFormat: "csv", targetFormat: "json", input: "id,name\\n1,Ada\\n" },
      { sourceFormat: "toml", targetFormat: "json", input: ${tomlSmokeInput} },
      { sourceFormat: "rust", targetFormat: "typescript", input: "struct User { id: u64 }" },
      { sourceFormat: "typescript", targetFormat: "rust", input: "interface User { id: number }" },
      { sourceFormat: "python", targetFormat: "typescript", input: "@dataclass\\nclass User:\\n    id: int" },
      { sourceFormat: "python", targetFormat: "python", input: "@dataclass\\nclass User:\\n    id: int" },
      { sourceFormat: "java", targetFormat: "java", input: "public record User(long id, String name) {}" },
      { sourceFormat: "go", targetFormat: "go", input: "package models\\ntype User struct { ID int64 }" },
      { sourceFormat: "json", targetFormat: "csv", input: "[{\\"id\\":1,\\"name\\":\\"Ada\\"}]" },
      { sourceFormat: "json", targetFormat: "toml", input: "{\\"id\\":1,\\"name\\":\\"Ada\\"}" },
    ];
    for (const item of cases) {
      const result = convert(item);
      if (!result.ok) {
        throw new Error(item.sourceFormat + "->" + item.targetFormat + " failed: " + result.message);
      }
    }
  `;

  const smokePath = path.join(tempRoot, "smoke.mjs");
  writeFileSync(smokePath, smokeScript);
  execFileSync(process.execPath, [smokePath], {
    cwd: tempRoot,
    stdio: "inherit",
  });

  const packageJson = JSON.parse(
    readFileSync(path.join(repoRoot, "packages/sdk/package.json"), "utf8"),
  );
  if (packageJson.private === true) {
    throw new Error(
      "@schema-transformation-toolkit/sdk must be publishable for the package smoke check.",
    );
  }

  console.log("SDK package smoke check passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function packageDirectoryFor(name) {
  const [, packageName] = name.split("/");

  if (packageName === "core") return "core";
  if (packageName.startsWith("parser-")) {
    return `parsers/${packageName.slice("parser-".length)}`;
  }
  return `generators/${packageName.slice("generator-".length)}`;
}
