import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import prettier from "prettier";
import ts from "typescript";

const repoRoot = process.cwd();
const updateSnapshots = process.argv.includes("--update");

const packageConfigs = [
  {
    name: "@schema-transformation-toolkit/core",
    root: path.join(repoRoot, "packages/core"),
    entry: path.join(repoRoot, "packages/core/src/index.ts"),
    snapshot: path.join(repoRoot, "packages/core/etc/core.api.md"),
  },
  {
    name: "@schema-transformation-toolkit/parser-json",
    root: path.join(repoRoot, "packages/parsers/json"),
    entry: path.join(repoRoot, "packages/parsers/json/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/parsers/json/etc/parser-json.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/parser-json-schema",
    root: path.join(repoRoot, "packages/parsers/json-schema"),
    entry: path.join(repoRoot, "packages/parsers/json-schema/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/parsers/json-schema/etc/parser-json-schema.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/parser-openapi",
    root: path.join(repoRoot, "packages/parsers/openapi"),
    entry: path.join(repoRoot, "packages/parsers/openapi/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/parsers/openapi/etc/parser-openapi.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/parser-typescript",
    root: path.join(repoRoot, "packages/parsers/typescript"),
    entry: path.join(repoRoot, "packages/parsers/typescript/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/parsers/typescript/etc/parser-typescript.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/parser-zod",
    root: path.join(repoRoot, "packages/parsers/zod"),
    entry: path.join(repoRoot, "packages/parsers/zod/src/index.ts"),
    snapshot: path.join(repoRoot, "packages/parsers/zod/etc/parser-zod.api.md"),
  },
  {
    name: "@schema-transformation-toolkit/parser-yaml",
    root: path.join(repoRoot, "packages/parsers/yaml"),
    entry: path.join(repoRoot, "packages/parsers/yaml/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/parsers/yaml/etc/parser-yaml.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/parser-csv",
    root: path.join(repoRoot, "packages/parsers/csv"),
    entry: path.join(repoRoot, "packages/parsers/csv/src/index.ts"),
    snapshot: path.join(repoRoot, "packages/parsers/csv/etc/parser-csv.api.md"),
  },
  {
    name: "@schema-transformation-toolkit/parser-toml",
    root: path.join(repoRoot, "packages/parsers/toml"),
    entry: path.join(repoRoot, "packages/parsers/toml/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/parsers/toml/etc/parser-toml.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-json-schema",
    root: path.join(repoRoot, "packages/generators/json-schema"),
    entry: path.join(repoRoot, "packages/generators/json-schema/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/json-schema/etc/generator-json-schema.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-json",
    root: path.join(repoRoot, "packages/generators/json"),
    entry: path.join(repoRoot, "packages/generators/json/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/json/etc/generator-json.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-openapi",
    root: path.join(repoRoot, "packages/generators/openapi"),
    entry: path.join(repoRoot, "packages/generators/openapi/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/openapi/etc/generator-openapi.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-typescript",
    root: path.join(repoRoot, "packages/generators/typescript"),
    entry: path.join(repoRoot, "packages/generators/typescript/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/typescript/etc/generator-typescript.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-zod",
    root: path.join(repoRoot, "packages/generators/zod"),
    entry: path.join(repoRoot, "packages/generators/zod/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/zod/etc/generator-zod.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-yaml",
    root: path.join(repoRoot, "packages/generators/yaml"),
    entry: path.join(repoRoot, "packages/generators/yaml/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/yaml/etc/generator-yaml.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-csv",
    root: path.join(repoRoot, "packages/generators/csv"),
    entry: path.join(repoRoot, "packages/generators/csv/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/csv/etc/generator-csv.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-toml",
    root: path.join(repoRoot, "packages/generators/toml"),
    entry: path.join(repoRoot, "packages/generators/toml/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/toml/etc/generator-toml.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/parser-rust",
    root: path.join(repoRoot, "packages/parsers/rust"),
    entry: path.join(repoRoot, "packages/parsers/rust/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/parsers/rust/etc/parser-rust.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/parser-python",
    root: path.join(repoRoot, "packages/parsers/python"),
    entry: path.join(repoRoot, "packages/parsers/python/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/parsers/python/etc/parser-python.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/parser-go",
    root: path.join(repoRoot, "packages/parsers/go"),
    entry: path.join(repoRoot, "packages/parsers/go/src/index.ts"),
    snapshot: path.join(repoRoot, "packages/parsers/go/etc/parser-go.api.md"),
  },
  {
    name: "@schema-transformation-toolkit/generator-rust",
    root: path.join(repoRoot, "packages/generators/rust"),
    entry: path.join(repoRoot, "packages/generators/rust/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/rust/etc/generator-rust.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-python",
    root: path.join(repoRoot, "packages/generators/python"),
    entry: path.join(repoRoot, "packages/generators/python/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/python/etc/generator-python.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/generator-go",
    root: path.join(repoRoot, "packages/generators/go"),
    entry: path.join(repoRoot, "packages/generators/go/src/index.ts"),
    snapshot: path.join(
      repoRoot,
      "packages/generators/go/etc/generator-go.api.md",
    ),
  },
  {
    name: "@schema-transformation-toolkit/sdk",
    root: path.join(repoRoot, "packages/sdk"),
    entry: path.join(repoRoot, "packages/sdk/src/index.ts"),
    snapshot: path.join(repoRoot, "packages/sdk/etc/sdk.api.md"),
  },
];

const snapshotMismatches = [];
const prettierConfig = await prettier.resolveConfig(repoRoot);

for (const pkg of packageConfigs) {
  const renderedSnapshot = await renderApiSnapshot(pkg, prettierConfig);

  if (updateSnapshots) {
    fs.mkdirSync(path.dirname(pkg.snapshot), { recursive: true });
    fs.writeFileSync(pkg.snapshot, renderedSnapshot);
    console.log(`Updated ${relative(pkg.snapshot)}`);
    continue;
  }

  if (!fs.existsSync(pkg.snapshot)) {
    snapshotMismatches.push(
      `${pkg.name}: missing snapshot ${relative(pkg.snapshot)}.`,
    );
    continue;
  }

  const existingSnapshot = fs.readFileSync(pkg.snapshot, "utf8");

  if (existingSnapshot !== renderedSnapshot) {
    snapshotMismatches.push(
      `${pkg.name}: snapshot mismatch in ${relative(pkg.snapshot)}. Run "pnpm check:api:update" to accept intentional public API changes.`,
    );
  }
}

if (updateSnapshots) {
  console.log("API snapshots updated.");
} else if (snapshotMismatches.length > 0) {
  console.error("Public API snapshot mismatches found:\n");

  for (const mismatch of snapshotMismatches) {
    console.error(`- ${mismatch}`);
  }

  process.exitCode = 1;
} else {
  console.log("Public API snapshots match.");
}

async function renderApiSnapshot(pkg, prettierConfig) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "schema-transformation-toolkit-api-"),
  );
  const parsedConfig = loadPackageTsConfig(pkg.root);

  const options = {
    ...parsedConfig.options,
    noEmit: false,
    emitDeclarationOnly: true,
    declaration: true,
    declarationMap: false,
    sourceMap: false,
    outDir: tempDir,
    rootDir: repoRoot,
  };

  const program = ts.createProgram({
    rootNames: [pkg.entry],
    options,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length > 0) {
    throw new Error(formatDiagnostics(diagnostics));
  }

  const emitResult = program.emit();

  if (emitResult.emitSkipped) {
    throw new Error(`Declaration emit skipped for ${pkg.name}.`);
  }

  const emittedEntryPath = path.join(
    tempDir,
    path.relative(repoRoot, pkg.entry).replace(/\.ts$/u, ".d.ts"),
  );
  const declarationFiles = collectReachableDeclarationFiles(emittedEntryPath);

  const sections = declarationFiles.map((filePath) => {
    const normalizedContent = normalizeDeclarationText(
      fs.readFileSync(filePath, "utf8"),
    );
    const displayPath = relative(
      path.join(repoRoot, path.relative(tempDir, filePath)),
    );

    return `## ${displayPath}\n\n\`\`\`ts\n${normalizedContent}\n\`\`\``;
  });

  fs.rmSync(tempDir, { recursive: true, force: true });

  const markdown = [
    `# API Snapshot: ${pkg.name}`,
    "",
    `Entry: ${relative(pkg.entry)}`,
    "",
    ...sections,
    "",
  ].join("\n");

  return prettier.format(markdown, {
    ...(prettierConfig ?? {}),
    parser: "markdown",
  });
}

function loadPackageTsConfig(packageRoot) {
  const configPath = ts.findConfigFile(
    packageRoot,
    ts.sys.fileExists,
    "tsconfig.json",
  );

  if (!configPath) {
    throw new Error(
      `Could not find tsconfig.json under ${relative(packageRoot)}.`,
    );
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(formatDiagnostics([configFile.error]));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  if (parsedConfig.errors.length > 0) {
    throw new Error(formatDiagnostics(parsedConfig.errors));
  }

  return parsedConfig;
}

function collectReachableDeclarationFiles(entryFilePath) {
  if (!fs.existsSync(entryFilePath)) {
    throw new Error(
      `Expected emitted entry declaration at ${relative(entryFilePath)}.`,
    );
  }

  const pending = [entryFilePath];
  const visited = new Set();
  const reachable = [];

  while (pending.length > 0) {
    const currentFilePath = pending.pop();

    if (!currentFilePath || visited.has(currentFilePath)) {
      continue;
    }

    visited.add(currentFilePath);
    reachable.push(currentFilePath);

    const sourceText = fs.readFileSync(currentFilePath, "utf8");
    const sourceFile = ts.createSourceFile(
      currentFilePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    for (const specifier of collectRelativeSpecifiers(sourceFile)) {
      const resolvedFilePath = resolveDeclarationSpecifier(
        currentFilePath,
        specifier,
      );

      if (resolvedFilePath) {
        pending.push(resolvedFilePath);
      }
    }
  }

  return reachable.sort();
}

function collectRelativeSpecifiers(sourceFile) {
  const specifiers = new Set();

  visitNode(sourceFile, (specifier) => {
    if (specifier.startsWith(".")) {
      specifiers.add(specifier);
    }
  });

  return [...specifiers];
}

function visitNode(node, onSpecifier) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    onSpecifier(node.moduleSpecifier.text);
  }

  if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteral(node.argument.literal)
  ) {
    onSpecifier(node.argument.literal.text);
  }

  ts.forEachChild(node, (child) => visitNode(child, onSpecifier));
}

function resolveDeclarationSpecifier(fromFilePath, specifier) {
  const basePath = path.resolve(path.dirname(fromFilePath), specifier);
  const extensionlessBasePath = stripKnownExtension(basePath);
  const candidates = [
    basePath,
    `${basePath}.d.ts`,
    `${extensionlessBasePath}.d.ts`,
    path.join(basePath, "index.d.ts"),
    path.join(extensionlessBasePath, "index.d.ts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function stripKnownExtension(filePath) {
  for (const extension of [".d.ts", ".ts", ".js", ".mjs", ".cjs"]) {
    if (filePath.endsWith(extension)) {
      return filePath.slice(0, -extension.length);
    }
  }

  return filePath;
}

function normalizeDeclarationText(text) {
  return text
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .trim();
}

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => repoRoot,
    getNewLine: () => "\n",
  });
}

function relative(targetPath) {
  return path.relative(repoRoot, targetPath).replaceAll(path.sep, "/");
}
