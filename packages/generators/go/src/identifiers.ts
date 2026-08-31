import { GoGenerationError } from "./failure.js";
const KEYWORDS = new Set([
  "break",
  "default",
  "func",
  "interface",
  "select",
  "case",
  "defer",
  "go",
  "map",
  "struct",
  "chan",
  "else",
  "goto",
  "package",
  "switch",
  "const",
  "fallthrough",
  "if",
  "range",
  "type",
  "continue",
  "for",
  "import",
  "return",
  "var",
]);
export function goIdentifier(source: string): string {
  const words = source
    .replace(/[^A-Za-z0-9]+/gu, " ")
    .trim()
    .split(/\s+|_/u)
    .filter(Boolean);
  const result = words
    .map((word) => {
      const lower = word.toLowerCase();
      if (INITIALISMS.has(lower)) return lower.toUpperCase();
      return word[0]!.toUpperCase() + word.slice(1);
    })
    .join("");
  if (!result)
    throw new GoGenerationError(
      "invalid-go-identifier",
      `"${source}" cannot be represented as a Go identifier.`,
    );
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(result) || KEYWORDS.has(result))
    throw new GoGenerationError(
      "invalid-go-identifier",
      `"${source}" cannot be represented as a Go identifier.`,
    );
  return result;
}
const INITIALISMS = new Set([
  "api",
  "id",
  "url",
  "uri",
  "http",
  "https",
  "json",
  "xml",
  "sql",
  "uuid",
  "ip",
  "tcp",
  "udp",
  "uid",
]);
