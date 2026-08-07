import type { ParseFailureResult } from "@schema-transformation-toolkit/core";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function classifyTomlParseError(error: unknown): {
  code: "invalid-toml" | "toml-unsafe-integer";
  message: string;
  evidence?: unknown;
} {
  const message = errorMessage(error);
  const code = message.includes("cannot be represented losslessly")
    ? "toml-unsafe-integer"
    : "invalid-toml";
  return { code, message, evidence: parseErrorEvidence(error) };
}

export function tomlFailure(
  code: string,
  message: string,
  evidence?: unknown,
): ParseFailureResult<string> {
  return {
    ok: false,
    code,
    message,
    diagnostics: [
      {
        severity: "error",
        code,
        message,
        source: "parser-toml",
        ...(evidence === undefined ? {} : { evidence }),
      },
    ],
  };
}

function parseErrorEvidence(error: unknown): unknown {
  if (!error || typeof error !== "object") return undefined;
  const source = error as Record<string, unknown>;
  const evidence: Record<string, number> = {};
  for (const key of ["line", "column", "offset"]) {
    if (typeof source[key] === "number") evidence[key] = source[key];
  }
  return Object.keys(evidence).length > 0 ? evidence : undefined;
}
