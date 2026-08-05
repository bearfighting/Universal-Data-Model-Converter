import ts from "typescript";
import { throwZodInferenceError } from "./errors.js";
import type { ZodBindingTable } from "./kernel-types.js";

export function collectZodBindings(sourceFile: ts.SourceFile): ZodBindingTable {
  const bindings = new Map<string, ts.Expression>();
  const exported = new Set<string>();
  const zBindingNames = new Set<string>();
  const importedBindings = new Map<string, { source: string; node: ts.Node }>();
  let hasZodImport = false;

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const source = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (!clause) continue;

    if (source === "zod") {
      hasZodImport = true;
      if (clause.name) {
        throwZodInferenceError(
          "unsupported-zod-import",
          "Default Zod imports are outside the supported static parser boundary; use a named or namespace import.",
          sourceFile,
          clause.name,
          ["imports", "zod"],
        );
      }
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        registerZodBinding(
          zBindingNames,
          clause.namedBindings.name.text,
          sourceFile,
          clause.namedBindings.name,
        );
      } else if (
        clause.namedBindings &&
        ts.isNamedImports(clause.namedBindings)
      ) {
        for (const element of clause.namedBindings.elements) {
          const imported = element.propertyName?.text ?? element.name.text;
          if (imported !== "z" || element.name.text !== "z") {
            throwZodInferenceError(
              "unsupported-zod-import",
              "Only the canonical z binding from zod is supported.",
              sourceFile,
              element,
              ["imports", "zod"],
            );
          }
          registerZodBinding(
            zBindingNames,
            element.name.text,
            sourceFile,
            element.name,
          );
        }
      }
      continue;
    }

    if (clause.name) {
      registerImportedBinding(
        importedBindings,
        clause.name.text,
        source,
        clause.name,
        sourceFile,
      );
    }
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      registerImportedBinding(
        importedBindings,
        clause.namedBindings.name.text,
        source,
        clause.namedBindings.name,
        sourceFile,
      );
    } else if (
      clause.namedBindings &&
      ts.isNamedImports(clause.namedBindings)
    ) {
      for (const element of clause.namedBindings.elements) {
        registerImportedBinding(
          importedBindings,
          element.name.text,
          source,
          element,
          sourceFile,
        );
      }
    }
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isExported =
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) ?? false;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue;
      }
      const name = declaration.name.text;
      if (
        bindings.has(name) ||
        zBindingNames.has(name) ||
        importedBindings.has(name)
      ) {
        throwZodInferenceError(
          "unsupported-zod-redeclaration",
          "The source redeclares binding " + name + ".",
          sourceFile,
          declaration.name,
          ["bindings", name],
        );
      }
      bindings.set(name, declaration.initializer);
      if (isExported) exported.add(name);
    }
  }

  if (!hasZodImport || zBindingNames.size === 0) {
    throwZodInferenceError(
      "unsupported-zod-import",
      "The Zod source must contain a canonical z import from zod.",
      sourceFile,
      sourceFile,
      ["imports", "zod"],
    );
  }
  if (zBindingNames.size !== 1 || !zBindingNames.has("z")) {
    throwZodInferenceError(
      "unsupported-zod-import",
      "The static parser requires exactly one canonical local Zod binding named z.",
      sourceFile,
      sourceFile,
      ["imports", "zod"],
    );
  }

  const reassignedBindings = collectReassignments(
    sourceFile,
    bindings,
    zBindingNames,
    importedBindings,
  );
  const zReassignment = reassignedBindings.get("z");
  if (zReassignment) {
    throwZodInferenceError(
      "unsupported-zod-redeclaration",
      "The canonical Zod binding z must not be reassigned.",
      sourceFile,
      zReassignment,
      ["bindings", "z"],
    );
  }

  return {
    bindings,
    exported,
    zBindingNames,
    importedBindings,
    reassignedBindings,
  };
}

export function selectZodEntry(
  bindings: ZodBindingTable,
  entry: string | undefined,
  sourceFile: ts.SourceFile,
): string {
  if (entry) {
    if (!bindings.bindings.has(entry)) {
      throwZodInferenceError(
        "missing-zod-schema-binding",
        "The Zod parser could not find schema binding " + entry + ".",
        sourceFile,
        sourceFile,
        ["entry", entry],
      );
    }
    return entry;
  }
  const exportedSchemas = [...bindings.exported].filter((name) =>
    name.endsWith("Schema"),
  );
  if (exportedSchemas.length === 1) return exportedSchemas[0]!;
  if (exportedSchemas.length > 1) {
    throwZodInferenceError(
      "ambiguous-zod-entry",
      "The Zod parser found multiple exported *Schema bindings; specify options.entry.",
      sourceFile,
      sourceFile,
      ["entry"],
    );
  }
  const schemaLikeBindings = [...bindings.bindings.keys()].filter((name) =>
    name.endsWith("Schema"),
  );
  if (schemaLikeBindings.length === 1) return schemaLikeBindings[0]!;
  if (schemaLikeBindings.length > 1) {
    throwZodInferenceError(
      "ambiguous-zod-entry",
      "The Zod parser found multiple schema-like bindings; specify options.entry.",
      sourceFile,
      sourceFile,
      ["entry"],
    );
  }
  throwZodInferenceError(
    "missing-zod-entry",
    "The Zod parser could not select a schema entry; export one *Schema binding or specify options.entry.",
    sourceFile,
    sourceFile,
    ["entry"],
  );
}

function registerZodBinding(
  names: Set<string>,
  name: string,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): void {
  if (names.has(name)) {
    throwZodInferenceError(
      "unsupported-zod-redeclaration",
      "The source declares duplicate Zod binding " + name + ".",
      sourceFile,
      node,
      ["bindings", name],
    );
  }
  names.add(name);
}

function registerImportedBinding(
  bindings: Map<string, { source: string; node: ts.Node }>,
  name: string,
  source: string,
  node: ts.Node,
  sourceFile: ts.SourceFile,
): void {
  if (bindings.has(name)) {
    throwZodInferenceError(
      "unsupported-zod-redeclaration",
      "The source declares duplicate imported binding " + name + ".",
      sourceFile,
      node,
      ["imports", name],
    );
  }
  bindings.set(name, { source, node });
}

function collectReassignments(
  sourceFile: ts.SourceFile,
  bindings: Map<string, ts.Expression>,
  zBindingNames: Set<string>,
  importedBindings: Map<string, { source: string; node: ts.Node }>,
): Map<string, ts.Identifier> {
  const trackedNames = new Set([
    ...bindings.keys(),
    ...zBindingNames,
    ...importedBindings.keys(),
  ]);
  const result = new Map<string, ts.Identifier>();
  const record = (
    identifier: ts.Identifier,
    shadowed: ReadonlySet<string>,
  ): void => {
    const name = identifier.text;
    if (!trackedNames.has(name) || shadowed.has(name)) return;
    if (!result.has(name)) result.set(name, identifier);
  };
  const visit = (node: ts.Node, shadowed: ReadonlySet<string>): void => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      ts.isIdentifier(node.left)
    ) {
      record(node.left, shadowed);
    } else if (
      ts.isPrefixUnaryExpression(node) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken) &&
      ts.isIdentifier(node.operand)
    ) {
      record(node.operand, shadowed);
    } else if (
      ts.isPostfixUnaryExpression(node) &&
      ts.isIdentifier(node.operand)
    ) {
      record(node.operand, shadowed);
    }
    if (isFunctionLike(node)) {
      const functionShadowed = extendShadowed(
        shadowed,
        collectFunctionScopedNames(node),
      );
      const body = getFunctionBody(node);
      if (body) visit(body, functionShadowed);
      return;
    }
    if (ts.isBlock(node)) {
      const blockShadowed = extendShadowed(
        shadowed,
        collectDirectBlockNames(node),
      );
      node.statements.forEach((statement) => visit(statement, blockShadowed));
      return;
    }
    if (ts.isCatchClause(node)) {
      const catchShadowed = new Set(shadowed);
      if (node.variableDeclaration) {
        collectBindingNames(node.variableDeclaration.name).forEach((name) =>
          catchShadowed.add(name),
        );
      }
      visit(node.block, catchShadowed);
      return;
    }
    if (
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node)
    ) {
      const initializer = node.initializer;
      const loopShadowed = extendShadowed(
        shadowed,
        initializer ? collectVariableDeclarationNames(initializer) : new Set(),
      );
      ts.forEachChild(node, (child) => visit(child, loopShadowed));
      return;
    }
    ts.forEachChild(node, (child) => visit(child, shadowed));
  };
  sourceFile.statements.forEach((statement) => visit(statement, new Set()));
  return result;
}

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function getFunctionBody(
  node: ts.FunctionLikeDeclaration,
): ts.Node | undefined {
  return node.body;
}

function collectFunctionScopedNames(
  node: ts.FunctionLikeDeclaration,
): Set<string> {
  const names = new Set<string>();
  node.parameters.forEach((parameter) =>
    collectBindingNames(parameter.name).forEach((name) => names.add(name)),
  );
  const body = node.body;
  if (!body) return names;
  const visit = (child: ts.Node): void => {
    if (child !== body && isFunctionLike(child)) return;
    if (
      ts.isVariableDeclarationList(child) &&
      (child.flags & ts.NodeFlags.Let) === 0
    ) {
      child.declarations.forEach((declaration) =>
        collectBindingNames(declaration.name).forEach((name) =>
          names.add(name),
        ),
      );
    }
    if (ts.isFunctionDeclaration(child) && child.name) {
      names.add(child.name.text);
    }
    ts.forEachChild(child, visit);
  };
  visit(body);
  return names;
}

function collectDirectBlockNames(node: ts.Block): Set<string> {
  const names = new Set<string>();
  for (const statement of node.statements) {
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach((declaration) => {
        if ((statement.declarationList.flags & ts.NodeFlags.Let) !== 0) {
          collectBindingNames(declaration.name).forEach((name) =>
            names.add(name),
          );
        }
      });
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      names.add(statement.name.text);
    }
  }
  return names;
}

function collectVariableDeclarationNames(node: ts.Node): Set<string> {
  const names = new Set<string>();
  if (ts.isVariableDeclarationList(node)) {
    node.declarations.forEach((declaration) => {
      collectBindingNames(declaration.name).forEach((name) => names.add(name));
    });
  }
  return names;
}

function collectBindingNames(name: ts.BindingName): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.BindingName): void => {
    if (ts.isIdentifier(node)) {
      names.add(node.text);
      return;
    }
    node.elements.forEach((element) => {
      if (ts.isBindingElement(element)) visit(element.name);
    });
  };
  visit(name);
  return names;
}

function extendShadowed(
  parent: ReadonlySet<string>,
  additions: ReadonlySet<string>,
): Set<string> {
  return new Set([...parent, ...additions]);
}
