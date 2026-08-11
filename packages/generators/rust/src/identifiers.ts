import { RustGenerationError } from "./failure.js";

const RUST_KEYWORDS = new Set([
  "as",
  "break",
  "const",
  "continue",
  "crate",
  "else",
  "enum",
  "extern",
  "false",
  "fn",
  "for",
  "if",
  "impl",
  "in",
  "let",
  "loop",
  "match",
  "mod",
  "move",
  "mut",
  "pub",
  "ref",
  "return",
  "self",
  "Self",
  "static",
  "struct",
  "super",
  "trait",
  "true",
  "type",
  "unsafe",
  "use",
  "where",
  "while",
  "async",
  "await",
  "dyn",
]);

export function rustIdentifier(source: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(source))
    throw new RustGenerationError(
      "invalid-rust-identifier",
      `Invalid Rust identifier "${source}".`,
    );
  return RUST_KEYWORDS.has(source) ? `r#${source}` : source;
}
