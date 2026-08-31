import { GoSyntaxError, type GoPosition } from "./failure.js";

interface Token {
  text: string;
  position: GoPosition;
}
export interface GoTypeSyntax {
  kind: "name" | "pointer" | "slice" | "array" | "map" | "struct" | "interface";
  name?: string;
  key?: GoTypeSyntax;
  value?: GoTypeSyntax;
  element?: GoTypeSyntax;
  length?: string;
  fields?: GoFieldSyntax[];
  empty?: boolean;
  position: GoPosition;
}
export interface GoTagSyntax {
  name?: string;
  options: string[];
  raw: string;
}
export interface GoFieldSyntax {
  name?: string;
  type: GoTypeSyntax;
  tag?: GoTagSyntax;
  position: GoPosition;
  embedded: boolean;
  exported: boolean;
}
export interface GoDeclarationSyntax {
  kind: "struct" | "type" | "alias";
  name: string;
  type: GoTypeSyntax;
  position: GoPosition;
}
export interface GoFileSyntax {
  declarations: GoDeclarationSyntax[];
}

export function parseGoSyntax(source: string): GoFileSyntax {
  return new Parser(tokenize(source)).parse();
}

function tokenize(source: string): Token[] {
  const result: Token[] = [];
  let i = 0;
  let line = 1;
  let column = 1;
  const advance = (text: string) => {
    for (const c of text) {
      if (c === "\n") {
        line++;
        column = 1;
      } else column++;
    }
    i += text.length;
  };
  while (i < source.length) {
    const start = { offset: i, line, column };
    const rest = source.slice(i);
    const ws = rest.match(/^\s+/u);
    if (ws) {
      advance(ws[0]);
      continue;
    }
    const comment = rest.match(/^\/\/[^\n]*|^\/\*[\s\S]*?\*\//u);
    if (comment) {
      advance(comment[0]);
      continue;
    }
    const raw = rest.match(/^`[^`]*`/u);
    if (raw) {
      result.push({ text: raw[0], position: start });
      advance(raw[0]);
      continue;
    }
    const string = rest.match(/^"(?:\\.|[^"\\])*"/u);
    if (string) {
      result.push({ text: string[0], position: start });
      advance(string[0]);
      continue;
    }
    const ident = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/u);
    if (ident) {
      result.push({ text: ident[0], position: start });
      advance(ident[0]);
      continue;
    }
    const number = rest.match(/^\d+/u);
    if (number) {
      result.push({ text: number[0], position: start });
      advance(number[0]);
      continue;
    }
    const punctuation = rest[0]!;
    if ("{}[]()*=,;".includes(punctuation)) {
      result.push({ text: punctuation, position: start });
      advance(punctuation);
      continue;
    }
    throw new GoSyntaxError(
      "invalid-go-syntax",
      `Unexpected Go character "${punctuation}".`,
      start,
    );
  }
  return result;
}

class Parser {
  private index = 0;
  constructor(private readonly tokens: Token[]) {}
  parse(): GoFileSyntax {
    const declarations: GoDeclarationSyntax[] = [];
    while (!this.end()) {
      if (this.match("package")) {
        this.expectIdentifier("Expected package name.");
        continue;
      }
      if (this.match("import")) {
        this.skipImport();
        continue;
      }
      if (this.match("type")) declarations.push(this.parseDeclaration());
      else if (this.match("func"))
        throw this.error(
          "unsupported-go-feature",
          "Functions and methods are not supported in Go V1.",
        );
      else if (this.match("const") || this.match("var"))
        throw this.error(
          "unsupported-go-feature",
          "Constants and variables are not supported in Go V1.",
        );
      else {
        const token = this.peek();
        throw this.error(
          "unsupported-go-feature",
          `Top-level Go syntax "${token?.text ?? ""}" is not supported in V1.`,
        );
      }
    }
    return { declarations };
  }
  private parseDeclaration(): GoDeclarationSyntax {
    const name = this.expectIdentifier("Expected a type name.");
    if (this.match("="))
      return {
        kind: "alias",
        name: name.text,
        type: this.parseType(),
        position: name.position,
      };
    const type = this.parseType();
    return {
      kind: type.kind === "struct" ? "struct" : "type",
      name: name.text,
      type,
      position: name.position,
    };
  }
  private parseType(): GoTypeSyntax {
    if (this.match("*"))
      return {
        kind: "pointer",
        element: this.parseType(),
        position: this.previous().position,
      };
    if (this.match("[")) {
      const position = this.previous().position;
      if (this.match("]"))
        return { kind: "slice", element: this.parseType(), position };
      const length = this.expectValue();
      this.expect("]", 'Expected "]" after array length.');
      return { kind: "array", length, element: this.parseType(), position };
    }
    if (this.match("{"))
      throw this.error("invalid-go-syntax", "Unexpected block.");
    const token = this.expectIdentifier("Expected a Go type.");
    if (token.text === "struct") return this.parseStruct(token.position);
    if (token.text === "interface") return this.parseInterface(token.position);
    if (token.text === "map") {
      this.expect("[", 'Expected "[" after map.');
      const key = this.parseType();
      this.expect("]", 'Expected "]" after map key.');
      return {
        kind: "map",
        key,
        value: this.parseType(),
        position: token.position,
      };
    }
    return { kind: "name", name: token.text, position: token.position };
  }
  private parseStruct(position: GoPosition): GoTypeSyntax {
    this.expect("{", 'Expected "{" after struct.');
    const fields: GoFieldSyntax[] = [];
    while (!this.match("}")) {
      if (this.end())
        throw this.error("invalid-go-syntax", "Unterminated Go struct.");
      const first = this.expectIdentifier("Expected a struct field name.");
      let name: string | undefined = first.text;
      let embedded = false;
      let type: GoTypeSyntax;
      if (
        this.isTypeStart(first.text) ||
        ["}", ";", ","].includes(this.peek()?.text ?? "")
      ) {
        name = undefined;
        embedded = true;
        type = this.typeFromConsumedName(first);
      } else {
        type = this.parseType();
      }
      let tag: GoTagSyntax | undefined;
      if (
        this.peek()?.text.startsWith("`") ||
        this.peek()?.text.startsWith('"')
      )
        tag = parseTag(this.advance().text);
      fields.push({
        ...(name ? { name } : {}),
        type,
        ...(tag ? { tag } : {}),
        position: first.position,
        embedded,
        exported: !!name && /^[A-Z]/u.test(name),
      });
      this.match(",");
      this.match(";");
    }
    return { kind: "struct", fields, position };
  }
  private parseInterface(position: GoPosition): GoTypeSyntax {
    this.expect("{", 'Expected "{" after interface.');
    if (this.match("}")) return { kind: "interface", empty: true, position };
    let depth = 1;
    while (depth && !this.end()) {
      const t = this.advance().text;
      if (t === "{") depth++;
      if (t === "}") depth--;
    }
    return { kind: "interface", empty: false, position };
  }
  private typeFromConsumedName(token: Token): GoTypeSyntax {
    if (token.text === "struct") return this.parseStruct(token.position);
    if (token.text === "interface") return this.parseInterface(token.position);
    return { kind: "name", name: token.text, position: token.position };
  }
  private isTypeStart(value: string): boolean {
    return [
      "*",
      "[",
      "struct",
      "interface",
      "map",
      "string",
      "bool",
      "byte",
      "rune",
      "int",
      "int8",
      "int16",
      "int32",
      "int64",
      "uint",
      "uint8",
      "uint16",
      "uint32",
      "uint64",
      "float32",
      "float64",
      "any",
    ].includes(value);
  }
  private skipImport(): void {
    if (this.peek()?.text.startsWith('"')) {
      this.advance();
      return;
    }
    if (this.match("(")) {
      while (!this.match(")")) {
        if (this.end())
          throw this.error("invalid-go-syntax", "Unterminated import block.");
        this.advance();
      }
      return;
    }
    this.advance();
  }
  private peek(): Token | undefined {
    return this.tokens[this.index];
  }
  private previous(): Token {
    return this.tokens[this.index - 1]!;
  }
  private advance(): Token {
    const token = this.peek();
    if (!token)
      throw this.error("invalid-go-syntax", "Unexpected end of Go source.");
    this.index++;
    return token;
  }
  private match(text: string): boolean {
    if (this.peek()?.text === text) {
      this.index++;
      return true;
    }
    return false;
  }
  private expect(text: string, message: string): Token {
    if (!this.match(text)) throw this.error("invalid-go-syntax", message);
    return this.previous();
  }
  private expectIdentifier(message: string): Token {
    const token = this.advance();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(token.text))
      throw this.error("invalid-go-syntax", message);
    return token;
  }
  private expectValue(): string {
    return this.advance().text;
  }
  private end(): boolean {
    return this.index >= this.tokens.length;
  }
  private error(
    code: "invalid-go-syntax" | "unsupported-go-feature",
    message: string,
  ): GoSyntaxError {
    return new GoSyntaxError(code, message, this.peek()?.position);
  }
}

function parseTag(raw: string): GoTagSyntax {
  const value = raw.startsWith("`") ? raw.slice(1, -1) : raw.slice(1, -1);
  const match = value.match(/(?:^|\s)json:"([^"]*)"/u);
  const content = match?.[1];
  const parts = content?.split(",") ?? [];
  const name = parts[0];
  return {
    raw: value,
    ...(content !== undefined && name && name !== "-" ? { name } : {}),
    options:
      content === "-"
        ? ["-"]
        : parts.slice(1).concat(name === "-" ? ["-"] : []),
  };
}
