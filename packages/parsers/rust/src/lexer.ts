export interface RustPosition {
  offset: number;
  line: number;
  column: number;
}

export interface RustToken {
  text: string;
  kind: "identifier" | "punctuation" | "eof";
  position: RustPosition;
  raw: boolean;
}

export class RustSyntaxError extends Error {
  readonly code:
    | "invalid-rust-syntax"
    | "unsupported-rust-feature"
    | "unsupported-rust-attribute"
    | "unsupported-rust-type";
  readonly position: RustPosition;

  constructor(
    code: RustSyntaxError["code"],
    message: string,
    position: RustPosition,
  ) {
    super(message);
    this.name = "RustSyntaxError";
    this.code = code;
    this.position = position;
  }
}

export function tokenizeRust(source: string): RustToken[] {
  const tokens: RustToken[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const position = (): RustPosition => ({ offset: index, line, column });
  const advance = (text: string): void => {
    for (const character of text) {
      if (character === "\n") {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
    }
    index += text.length;
  };

  while (index < source.length) {
    const character = source[index] ?? "";
    if (/\s/u.test(character)) {
      advance(character);
      continue;
    }

    if (source.startsWith("//", index)) {
      const end = source.indexOf("\n", index);
      advance(source.slice(index, end < 0 ? source.length : end));
      continue;
    }

    if (source.startsWith("/*", index)) {
      const start = position();
      const end = source.indexOf("*/", index + 2);
      if (end < 0) {
        throw new RustSyntaxError(
          "invalid-rust-syntax",
          "Unterminated Rust block comment.",
          start,
        );
      }
      advance(source.slice(index, end + 2));
      continue;
    }

    const start = position();
    if (source.startsWith("::", index)) {
      tokens.push({
        text: "::",
        kind: "punctuation",
        position: start,
        raw: false,
      });
      advance("::");
      continue;
    }

    if (
      source.startsWith("r#", index) &&
      /[A-Za-z_]/u.test(source[index + 2] ?? "")
    ) {
      const match = source.slice(index + 2).match(/^[A-Za-z_][A-Za-z0-9_]*/u);
      const text = match?.[0];
      if (text) {
        tokens.push({ text, kind: "identifier", position: start, raw: true });
        advance(`r#${text}`);
        continue;
      }
    }

    const identifier = source
      .slice(index)
      .match(/^[A-Za-z_][A-Za-z0-9_]*/u)?.[0];
    if (identifier) {
      tokens.push({
        text: identifier,
        kind: "identifier",
        position: start,
        raw: false,
      });
      advance(identifier);
      continue;
    }

    const number = source.slice(index).match(/^\d+/u)?.[0];
    if (number) {
      tokens.push({
        text: number,
        kind: "identifier",
        position: start,
        raw: false,
      });
      advance(number);
      continue;
    }

    if ("{}()[]<>,:;&*#!'=;+-|/".includes(character)) {
      tokens.push({
        text: character,
        kind: "punctuation",
        position: start,
        raw: false,
      });
      advance(character);
      continue;
    }

    throw new RustSyntaxError(
      "invalid-rust-syntax",
      `Unexpected Rust character "${character}".`,
      start,
    );
  }

  tokens.push({
    text: "<eof>",
    kind: "eof",
    position: position(),
    raw: false,
  });
  return tokens;
}
