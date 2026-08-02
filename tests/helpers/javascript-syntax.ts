import { expect } from "vitest";
import ts from "typescript";

export function expectValidJavaScriptModule(
  output: string,
  fileName = "generated.mjs",
): void {
  const sourceFile = ts.createSourceFile(
    fileName,
    output,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const parseDiagnostics =
    (
      sourceFile as typeof sourceFile & {
        parseDiagnostics?: readonly ts.Diagnostic[];
      }
    ).parseDiagnostics ?? [];

  expect(parseDiagnostics).toHaveLength(0);
}
