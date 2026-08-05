import {
  constraint,
  schemaObjectNode,
  schemaScalarNode,
} from "@schema-transformation-toolkit/core";
import ts from "typescript";
import { throwZodInferenceError } from "./errors.js";
import {
  materializeExpression,
  type ExpressionUsage,
  type ParseExpression,
  type ParsedExpression,
  type ZodParserContext,
} from "./kernel-types.js";
import {
  readStaticJsonValue,
  readStaticLiteral,
  readStaticRegex,
  requireStaticNumber,
} from "./static-values.js";
import { sourceLocation } from "./diagnostics.js";

export function applyZodMethod(
  parsed: ParsedExpression,
  method: string,
  args: ts.NodeArray<ts.Expression>,
  context: ZodParserContext,
  path: string[],
  usage: ExpressionUsage,
  node: ts.CallExpression,
  parseExpression: ParseExpression,
): ParsedExpression {
  if (method === "optional" && args.length === 0) {
    if (usage !== "field" && usage !== "tuple-element") {
      throwZodInferenceError(
        "unsupported-zod-optional-presence",
        "Optional presence is only representable for object fields and tuple elements.",
        context.sourceFile,
        node,
        path,
      );
    }
    return { ...parsed, presence: "optional" };
  }
  if (method === "nullable" && args.length === 0) {
    return { ...parsed, nullable: true };
  }
  if (method === "describe") {
    if (args.length !== 1 || typeof readStaticLiteral(args[0]!) !== "string") {
      throwZodInferenceError(
        "unsupported-zod-metadata",
        "Zod .describe() requires exactly one static string argument.",
        context.sourceFile,
        node,
        path,
      );
    }
    const value = readStaticLiteral(args[0]!) as string;
    setMetadataConstraint(
      context,
      path,
      constraint("description", { value }),
      node,
      "describe",
    );
    return parsed;
  }
  if (method === "default") {
    if (args.length !== 1) {
      throwZodInferenceError(
        "unsupported-zod-metadata",
        "Zod .default() requires exactly one static JSON-compatible value.",
        context.sourceFile,
        node,
        path,
      );
    }
    const value = readStaticJsonValue(args[0]!);
    if (value === undefined) {
      throwZodInferenceError(
        "unsupported-zod-metadata",
        "Zod .default() requires one static JSON-compatible value.",
        context.sourceFile,
        node,
        path,
      );
    }
    setMetadataConstraint(
      context,
      path,
      constraint("default", { value }),
      node,
      "default",
    );
    context.semanticNotes.push({
      kind: "loss",
      code: "zod-default-input-presence",
      message:
        "Zod default values allow the input field to be omitted, but the shared Shape IR preserves the post-default required output shape.",
      path,
      nodeKind: "type",
      source: "parser-zod",
      layer: "shape",
      evidence: {
        sourceLocation: sourceLocation(context.sourceFile, node),
      },
    });
    return parsed;
  }
  if (method === "int" && args.length === 0) {
    if (parsed.node.kind !== "scalar" || parsed.node.scalar !== "number") {
      throwUnsupportedMethod(context, node, path, method);
    }
    return { ...parsed, node: schemaScalarNode("integer") };
  }
  if (method === "int") {
    throwUnsupportedMethod(context, node, path, method);
  }
  if (method === "catchall" && args.length === 1) {
    if (parsed.node.kind !== "object") {
      throwUnsupportedMethod(context, node, path, method);
    }
    return {
      ...parsed,
      node: schemaObjectNode(parsed.node.fields, {
        additionalProperties: materializeExpression(
          parseExpression(
            args[0]!,
            context,
            [...path, "additionalProperties"],
            "nested",
          ),
        ),
      }),
    };
  }
  if (method === "catchall") {
    throwUnsupportedMethod(context, node, path, method);
  }

  if (method === "regex" && args.length === 1) {
    if (!isStringNode(parsed))
      throwUnsupportedMethod(context, node, path, method);
    const regex = readStaticRegex(args[0]!);
    if (regex) {
      if (regex.flags.length > 0) {
        throwZodInferenceError(
          "unsupported-zod-regex-flags",
          "Regex flags are not currently representable by the shared pattern constraint.",
          context.sourceFile,
          args[0]!,
          path,
        );
      }
      context.constraints.add(
        path,
        constraint("pattern", { value: regex.pattern }),
      );
      return parsed;
    }
    const value = readStaticLiteral(args[0]!);
    if (typeof value !== "string")
      throwUnsupportedConstraint(context, node, path, "regex");
    context.constraints.add(path, constraint("pattern", { value }));
    return parsed;
  }
  if (method === "regex") {
    throwUnsupportedMethod(context, node, path, method);
  }
  if ((method === "email" || method === "url") && args.length === 0) {
    if (!isStringNode(parsed))
      throwUnsupportedMethod(context, node, path, method);
    context.constraints.add(path, constraint("format", { value: method }));
    return parsed;
  }
  if (method === "email" || method === "url") {
    throwUnsupportedMethod(context, node, path, method);
  }
  if (method === "min" || method === "max" || method === "length") {
    if (args.length !== 1) {
      throwUnsupportedConstraint(context, node, path, method);
    }
    const value = requireStaticNumber(
      args[0],
      context.sourceFile,
      node,
      path,
      method,
    );
    const kinds = constraintKinds(parsed);
    if (!kinds) throwUnsupportedConstraint(context, node, path, method);
    if (method === "min") {
      context.constraints.add(path, constraint(kinds[0], { value }));
    } else if (method === "max") {
      context.constraints.add(path, constraint(kinds[1], { value }));
    } else {
      context.constraints.add(path, constraint(kinds[0], { value }));
      context.constraints.add(path, constraint(kinds[1], { value }));
    }
    return parsed;
  }
  throwUnsupportedMethod(context, node, path, method);
}

function setMetadataConstraint(
  context: ZodParserContext,
  path: string[],
  item: ReturnType<typeof constraint>,
  node: ts.CallExpression,
  method: string,
): void {
  const replaced = context.constraints.replace(path, item);
  if (replaced) {
    context.semanticNotes.push({
      kind: "normalization",
      code: "zod-metadata-overridden",
      message:
        "A later Zod ." +
        method +
        "() call overrides earlier metadata at this path.",
      path,
      nodeKind: "type",
      source: "parser-zod",
      layer: "constraint",
      evidence: {
        sourceLocation: sourceLocation(context.sourceFile, node),
      },
    });
  }
}

function constraintKinds(
  parsed: ParsedExpression,
): [string, string] | undefined {
  if (parsed.node.kind !== "scalar" && parsed.node.kind !== "array")
    return undefined;
  if (parsed.node.kind === "array") return ["min-items", "max-items"];
  if (parsed.node.scalar === "string") return ["min-length", "max-length"];
  if (parsed.node.scalar === "number" || parsed.node.scalar === "integer") {
    return ["minimum", "maximum"];
  }
  return undefined;
}

function isStringNode(parsed: ParsedExpression): boolean {
  return parsed.node.kind === "scalar" && parsed.node.scalar === "string";
}

function throwUnsupportedMethod(
  context: ZodParserContext,
  node: ts.CallExpression,
  path: string[],
  method: string,
): never {
  throwZodInferenceError(
    "unsupported-zod-method",
    `Zod method ".${method}()" is outside the supported static schema subset for this schema kind.`,
    context.sourceFile,
    node,
    path,
  );
}

function throwUnsupportedConstraint(
  context: ZodParserContext,
  node: ts.CallExpression,
  path: string[],
  method: string,
): never {
  throwZodInferenceError(
    "unsupported-zod-constraint",
    `Zod constraint ".${method}()" cannot be represented for this schema kind.`,
    context.sourceFile,
    node,
    path,
  );
}
