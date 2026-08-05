import {
  schemaDefinition,
  schemaDocument,
  schemaReferenceNode,
  type ConstraintDocument,
  type SchemaDiagnostic,
  type SchemaDocument,
  type SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import ts from "typescript";
import { collectZodBindings, selectZodEntry } from "./bindings.js";
import { createConstraintCollection } from "./constraints.js";
import { sourceLocation } from "./diagnostics.js";
import { ZodInferenceError, throwZodInferenceError } from "./errors.js";
import { parseZodExpression } from "./expression.js";
import type { BindingState, ZodParserContext } from "./kernel-types.js";
import type { ResolvedZodParseOptions } from "./options.js";
import { materializeExpression } from "./kernel-types.js";

export function parseZodSource(
  input: string,
  options: ResolvedZodParseOptions,
): {
  document: SchemaDocument;
  constraints: ConstraintDocument;
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
} {
  const sourceFile = ts.createSourceFile(
    "inline.ts",
    input,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const parseDiagnostic = (
    sourceFile as ts.SourceFile & {
      parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
    }
  ).parseDiagnostics?.[0];
  if (parseDiagnostic) {
    const start = parseDiagnostic.start ?? 0;
    const length = parseDiagnostic.length ?? 0;
    const node = sourceFile;
    throw new ZodInferenceError(
      "invalid-zod-source",
      "The Zod source contains syntax errors.",
      [
        {
          severity: "error",
          code: "invalid-zod-source",
          message: "The Zod source contains syntax errors.",
          source: "parser-zod",
          evidence: {
            sourceLocation: sourceLocation(sourceFile, start, length),
            detail: ts.flattenDiagnosticMessageText(
              parseDiagnostic.messageText,
              "\n",
            ),
            fallbackNode: node.kind,
          },
        },
      ],
    );
  }

  const bindings = collectZodBindings(sourceFile);
  const entry = selectZodEntry(bindings, options.entry, sourceFile);
  const context: ZodParserContext = {
    sourceFile,
    options,
    bindings,
    states: new Map(),
    definitions: [],
    constraints: createConstraintCollection(),
    diagnostics: [],
    semanticNotes: [],
    ensureDefinition: () => undefined,
  };
  context.ensureDefinition = (name, edge) =>
    ensureDefinition(name, edge, context);

  ensureDefinition(entry, "reference", context);
  return {
    document: schemaDocument(options.name, schemaReferenceNode(entry), {
      definitions: context.definitions,
    }),
    constraints: context.constraints.document(options.name),
    diagnostics: context.diagnostics,
    semanticNotes: context.semanticNotes,
  };
}

function ensureDefinition(
  name: string,
  edge: "reference" | "lazy",
  context: ZodParserContext,
): void {
  const state: BindingState = context.states.get(name) ?? "unvisited";
  if (state === "converted") return;
  if (state === "visiting") {
    if (edge === "lazy") return;
    throwZodInferenceError(
      "unsupported-zod-reference-cycle",
      `Schema reference cycle involving "${name}" must be introduced through z.lazy().`,
      context.sourceFile,
      context.bindings.bindings.get(name) ?? context.sourceFile,
      ["definitions", name],
    );
  }
  const expression = context.bindings.bindings.get(name);
  if (!expression) {
    throwZodInferenceError(
      "unknown-zod-schema-reference",
      `Unknown Zod schema reference "${name}".`,
      context.sourceFile,
      context.sourceFile,
      ["definitions", name],
    );
  }
  const reassigned = context.bindings.reassignedBindings.get(name);
  if (reassigned) {
    throwZodInferenceError(
      "unsupported-zod-redeclaration",
      "Schema binding " + name + " is reassigned after declaration.",
      context.sourceFile,
      reassigned,
      ["bindings", name],
    );
  }
  context.states.set(name, "visiting");
  try {
    const parsed = parseZodExpression(
      expression,
      context,
      ["definitions", name],
      "definition",
    );
    if (parsed.presence === "optional") {
      throwZodInferenceError(
        "unsupported-zod-optional-presence",
        "Optional presence is not representable for a standalone schema definition.",
        context.sourceFile,
        expression,
        ["definitions", name],
      );
    }
    context.definitions.push(
      schemaDefinition(name, materializeExpression(parsed)),
    );
    context.states.set(name, "converted");
  } catch (error) {
    context.states.delete(name);
    throw error;
  }
}
