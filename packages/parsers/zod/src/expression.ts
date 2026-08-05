import ts from "typescript";
import { throwZodInferenceError } from "./errors.js";
import { parseZodConstructor } from "./constructors.js";
import { applyZodMethod } from "./methods.js";
import type { ParseExpression } from "./kernel-types.js";
import { unwrapExpression } from "./static-values.js";

export const parseZodExpression: ParseExpression = (
  expression,
  context,
  path,
  usage,
) => {
  const node = unwrapExpression(expression);
  if (ts.isIdentifier(node)) {
    if (context.bindings.importedBindings.has(node.text)) {
      throwZodInferenceError(
        "unsupported-zod-import",
        "A schema expression cannot depend on a non-Zod imported binding.",
        context.sourceFile,
        node,
        path,
      );
    }
    if (!context.bindings.bindings.has(node.text)) {
      throwZodInferenceError(
        "unknown-zod-schema-reference",
        `Unknown Zod schema reference "${node.text}".`,
        context.sourceFile,
        node,
        path,
      );
    }
    context.ensureDefinition(node.text, "reference");
    return {
      node: { kind: "reference", name: node.text },
      presence: "required",
      nullable: false,
    };
  }
  if (!ts.isCallExpression(node)) {
    throwZodInferenceError(
      "unsupported-zod-expression",
      "Zod schema expressions must be statically analyzable call expressions or schema references.",
      context.sourceFile,
      node,
      path,
    );
  }

  if (ts.isPropertyAccessExpression(node.expression)) {
    const receiver = node.expression.expression;
    if (
      ts.isIdentifier(receiver) &&
      context.bindings.zBindingNames.has(receiver.text)
    ) {
      return parseZodConstructor(
        node.expression.name.text,
        node.arguments,
        context,
        path,
        usage,
        node,
        parseZodExpression,
      );
    }
    const parsed = parseZodExpression(
      receiver as ts.Expression,
      context,
      path,
      usage,
    );
    return applyZodMethod(
      parsed,
      node.expression.name.text,
      node.arguments,
      context,
      path,
      usage,
      node,
      parseZodExpression,
    );
  }

  throwZodInferenceError(
    ts.isIdentifier(node.expression)
      ? "unsupported-zod-constructor"
      : "unsupported-zod-expression",
    ts.isIdentifier(node.expression)
      ? `Dynamic schema factory "${node.expression.text}()" is outside the supported static subset.`
      : "Unsupported Zod call expression.",
    context.sourceFile,
    node,
    path,
  );
};
