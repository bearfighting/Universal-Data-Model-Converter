import {
  constraint,
  schemaArrayNode,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "@schema-transformation-toolkit/core";
import ts from "typescript";
import { sourceLocation } from "./diagnostics.js";
import { throwZodInferenceError } from "./errors.js";
import {
  materializeExpression,
  type ExpressionUsage,
  type ParseExpression,
  type ParsedExpression,
  type ZodParserContext,
} from "./kernel-types.js";
import {
  readStaticLiteral,
  requireStaticPropertyName,
  unwrapExpression,
} from "./static-values.js";

export function parseZodConstructor(
  name: string,
  args: ts.NodeArray<ts.Expression>,
  context: ZodParserContext,
  path: string[],
  usage: ExpressionUsage,
  node: ts.CallExpression,
  parseExpression: ParseExpression,
): ParsedExpression {
  switch (name) {
    case "string":
      return required(schemaScalarNode("string"));
    case "number":
      return required(schemaScalarNode("number"));
    case "boolean":
      return required(schemaScalarNode("boolean"));
    case "null":
      return required(schemaNullNode());
    case "unknown":
      return required(schemaUnknownNode());
    case "literal": {
      if (args.length !== 1) {
        throwZodInferenceError(
          "unsupported-zod-expression",
          "z.literal() requires exactly one static value.",
          context.sourceFile,
          node,
          path,
        );
      }
      const value = readStaticLiteral(args[0]!);
      if (value === undefined) {
        throwZodInferenceError(
          "unsupported-zod-expression",
          "z.literal() requires one static string, number, boolean, or null value.",
          context.sourceFile,
          node,
          path,
        );
      }
      return required(
        value === null ? schemaNullNode() : schemaLiteralNode(value),
      );
    }
    case "enum": {
      requireArity(args, 1, context, node, path);
      const values = args[0];
      if (
        !values ||
        !ts.isArrayLiteralExpression(values) ||
        values.elements.length === 0
      ) {
        throwZodInferenceError(
          "unsupported-zod-enum",
          "z.enum() requires a non-empty static array of string literals.",
          context.sourceFile,
          values ?? node,
          path,
        );
      }
      const members = values.elements.map((element) => {
        if (!ts.isExpression(element)) {
          throwZodInferenceError(
            "unsupported-zod-enum",
            "z.enum() does not support spread elements.",
            context.sourceFile,
            element,
            path,
          );
        }
        const value = readStaticLiteral(element);
        if (typeof value !== "string") {
          throwZodInferenceError(
            "unsupported-zod-enum",
            "z.enum() members must be static string literals.",
            context.sourceFile,
            element,
            path,
          );
        }
        return schemaLiteralNode(value);
      });
      const uniqueValues = new Set(members.map((member) => member.value)).size;
      context.semanticNotes.push({
        kind: "normalization",
        code: "zod-enum-lowered",
        message: "Static z.enum() was lowered to a shared literal union.",
        path,
        nodeKind: "union",
        source: "parser-zod",
        layer: "shape",
        evidence: {
          sourceLocation: sourceLocation(context.sourceFile, node),
          originalMemberCount: members.length,
          normalizedMemberCount: uniqueValues,
        },
      });
      return required(schemaUnionNode(members));
    }
    case "object":
      return parseObject(
        args,
        context,
        path,
        usage,
        node,
        false,
        parseExpression,
      );
    case "strictObject":
      return parseObject(
        args,
        context,
        path,
        usage,
        node,
        true,
        parseExpression,
      );
    case "array": {
      requireArity(args, 1, context, node, path);
      return required(
        schemaArrayNode(
          materializeExpression(
            parseExpression(args[0]!, context, [...path, "items"], "nested"),
          ),
        ),
      );
    }
    case "tuple": {
      requireArity(args, 1, context, node, path);
      const tuple = args[0];
      if (!tuple || !ts.isArrayLiteralExpression(tuple)) {
        throwZodInferenceError(
          "unsupported-zod-expression",
          "z.tuple() requires a static array literal.",
          context.sourceFile,
          node,
          path,
        );
      }
      const elements = tuple.elements.map((element, index) => {
        if (!ts.isExpression(element)) {
          throwZodInferenceError(
            "unsupported-zod-expression",
            "z.tuple() does not support spread elements in the static subset.",
            context.sourceFile,
            element,
            path,
          );
        }
        const parsed = parseExpression(
          element,
          context,
          [...path, String(index)],
          "tuple-element",
        );
        return schemaTupleElement(materializeExpression(parsed), {
          required: parsed.presence === "required",
        });
      });
      return required(schemaTupleNode(elements));
    }
    case "union": {
      requireArity(args, 1, context, node, path);
      const members = args[0];
      if (!members || !ts.isArrayLiteralExpression(members)) {
        throwZodInferenceError(
          "unsupported-zod-expression",
          "z.union() requires a static array literal.",
          context.sourceFile,
          node,
          path,
        );
      }
      if (members.elements.length < 2) {
        throwZodInferenceError(
          "unsupported-zod-union",
          "z.union() requires at least two schema members.",
          context.sourceFile,
          members,
          path,
        );
      }
      const nodes = members.elements.map((element, index) => {
        if (!ts.isExpression(element)) {
          throwZodInferenceError(
            "unsupported-zod-expression",
            "z.union() does not support spread elements in the static subset.",
            context.sourceFile,
            element,
            path,
          );
        }
        return materializeExpression(
          parseExpression(
            element,
            context,
            [...path, "union", String(index)],
            "nested",
          ),
        );
      });
      return required(schemaUnionNode(nodes));
    }
    case "record": {
      if (args.length !== 1 && args.length !== 2) {
        throwZodInferenceError(
          "unsupported-zod-expression",
          "z.record() requires one value schema or a key and value schema.",
          context.sourceFile,
          node,
          path,
        );
      }
      const key =
        args.length === 1
          ? schemaScalarNode("string")
          : materializeExpression(
              parseExpression(args[0]!, context, [...path, "key"], "nested"),
            );
      if (!(key.kind === "scalar" && key.scalar === "string")) {
        throwZodInferenceError(
          "unsupported-zod-constraint",
          "z.record() keys must lower to the shared string scalar semantics.",
          context.sourceFile,
          node,
          path,
        );
      }
      return required(
        schemaRecordNode(
          key,
          materializeExpression(
            parseExpression(
              args[args.length === 1 ? 0 : 1]!,
              context,
              [...path, "value"],
              "nested",
            ),
          ),
        ),
      );
    }
    case "lazy": {
      requireArity(args, 1, context, node, path);
      const argument = args[0];
      if (
        !argument ||
        !ts.isArrowFunction(argument) ||
        argument.parameters.length !== 0 ||
        !ts.isIdentifier(unwrapExpression(argument.body as ts.Expression))
      ) {
        throwZodInferenceError(
          "unsupported-zod-lazy",
          "z.lazy() only supports a zero-argument function returning a schema identifier.",
          context.sourceFile,
          node,
          path,
        );
      }
      const identifier = unwrapExpression(
        argument.body as ts.Expression,
      ) as ts.Identifier;
      if (!context.bindings.bindings.has(identifier.text)) {
        throwZodInferenceError(
          "unknown-zod-schema-reference",
          `Unknown Zod lazy reference "${identifier.text}".`,
          context.sourceFile,
          identifier,
          path,
        );
      }
      context.ensureDefinition(identifier.text, "lazy");
      return required(schemaReferenceNode(identifier.text));
    }
    default:
      throwZodInferenceError(
        "unsupported-zod-constructor",
        `Zod constructor "z.${name}()" is outside the supported static schema subset.`,
        context.sourceFile,
        node,
        path,
      );
  }
}

function parseObject(
  args: ts.NodeArray<ts.Expression>,
  context: ZodParserContext,
  path: string[],
  _usage: ExpressionUsage,
  node: ts.CallExpression,
  closed: boolean,
  parseExpression: ParseExpression,
): ParsedExpression {
  requireArity(args, 1, context, node, path);
  const shape = args[0];
  if (!shape || !ts.isObjectLiteralExpression(shape)) {
    throwZodInferenceError(
      "unsupported-zod-expression",
      "Zod object constructors require a static object literal shape.",
      context.sourceFile,
      node,
      path,
    );
  }
  const fields = shape.properties.map((property) => {
    if (!ts.isPropertyAssignment(property)) {
      throwZodInferenceError(
        "unsupported-zod-object-key",
        "Zod object shapes do not support spreads or methods in the static subset.",
        context.sourceFile,
        property,
        path,
      );
    }
    const name = requireStaticPropertyName(
      property.name,
      context.sourceFile,
      path,
    );
    const fieldPath = [...path, name];
    const parsed = parseExpression(
      property.initializer,
      context,
      fieldPath,
      "field",
    );
    return schemaFieldNode(name, parsed.node, {
      required: parsed.presence === "required",
      ...(parsed.nullable ? { nullable: true } : {}),
    });
  });
  if (closed) {
    context.constraints.add(path, constraint("closed-object", { value: true }));
  } else {
    context.semanticNotes.push({
      kind: "policy",
      code: "zod-object-unknown-keys-policy",
      message:
        "Plain z.object() unknown-key behavior is not fully represented in shared IR.",
      path,
      nodeKind: "object",
      source: "parser-zod",
      layer: "shape",
    });
  }
  return required(schemaObjectNode(fields));
}

function required(node: ParsedExpression["node"]): ParsedExpression {
  return { node, presence: "required", nullable: false };
}

function requireArity(
  args: ts.NodeArray<ts.Expression>,
  expected: number,
  context: ZodParserContext,
  node: ts.CallExpression,
  path: string[],
): void {
  if (args.length !== expected) {
    throwZodInferenceError(
      "unsupported-zod-expression",
      `This Zod constructor requires exactly ${expected} argument${expected === 1 ? "" : "s"}.`,
      context.sourceFile,
      node,
      path,
    );
  }
}
