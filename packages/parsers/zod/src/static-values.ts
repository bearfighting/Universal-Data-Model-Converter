import ts from "typescript";
import { throwZodInferenceError } from "./errors.js";

export type StaticLiteral = string | number | boolean | null;
export type StaticJsonValue =
  StaticLiteral | StaticJsonValue[] | { [key: string]: StaticJsonValue };

export function unwrapExpression(expression: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression;
}

export function readStaticLiteral(
  expression: ts.Expression,
): StaticLiteral | undefined {
  const node = unwrapExpression(expression);
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) {
    const value = Number(node.text);
    return Number.isFinite(value) ? value : undefined;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node)) {
    const value = readStaticLiteral(node.operand);
    if (typeof value !== "number") return undefined;
    if (node.operator === ts.SyntaxKind.MinusToken) return -value;
    if (node.operator === ts.SyntaxKind.PlusToken) return value;
  }
  return undefined;
}

export function readStaticJsonValue(
  expression: ts.Expression,
): StaticJsonValue | undefined {
  const node = unwrapExpression(expression);
  const literal = readStaticLiteral(node);
  if (literal !== undefined) return literal;

  if (ts.isArrayLiteralExpression(node)) {
    const values: StaticJsonValue[] = [];
    for (const element of node.elements) {
      if (!ts.isExpression(element)) return undefined;
      const value = readStaticJsonValue(element);
      if (value === undefined) return undefined;
      values.push(value);
    }
    return values;
  }

  if (ts.isObjectLiteralExpression(node)) {
    const value = Object.create(null) as {
      [key: string]: StaticJsonValue;
    };
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) return undefined;
      const name = property.name;
      if (
        !ts.isIdentifier(name) &&
        !ts.isStringLiteral(name) &&
        !ts.isNumericLiteral(name)
      )
        return undefined;
      const propertyValue = readStaticJsonValue(property.initializer);
      if (propertyValue === undefined) return undefined;
      value[name.text] = propertyValue;
    }
    return value;
  }

  return undefined;
}

export function readStaticRegex(
  expression: ts.Expression,
): { pattern: string; flags: string } | undefined {
  const node = unwrapExpression(expression);
  if (!ts.isRegularExpressionLiteral(node)) return undefined;
  const separator = node.text.lastIndexOf("/");
  return {
    pattern: node.text.slice(1, separator),
    flags: node.text.slice(separator + 1),
  };
}

export function requireStaticNumber(
  expression: ts.Expression | undefined,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  path: string[],
  method: string,
): number {
  const value = expression ? readStaticLiteral(expression) : undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throwZodInferenceError(
      "unsupported-zod-constraint",
      `Zod method ".${method}()" requires a finite numeric argument.`,
      sourceFile,
      node,
      path,
    );
  }
  return value;
}

export function requireStaticPropertyName(
  name: ts.PropertyName,
  sourceFile: ts.SourceFile,
  path: string[],
): string {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  throwZodInferenceError(
    "unsupported-zod-object-key",
    "Zod object keys must be static identifiers or string literals.",
    sourceFile,
    name,
    path,
  );
}
