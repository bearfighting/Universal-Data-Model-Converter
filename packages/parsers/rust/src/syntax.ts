import {
  RustSyntaxError,
  type RustPosition,
  type RustToken,
  tokenizeRust,
} from "./lexer.js";

export { RustSyntaxError } from "./lexer.js";

export interface RustTypeSyntax {
  kind: "named" | "reference" | "generic";
  path: string[];
  raw: boolean;
  inner?: RustTypeSyntax;
  position: RustPosition;
}

export interface RustFieldSyntax {
  name: string;
  raw: boolean;
  type: RustTypeSyntax;
}

export interface RustStructSyntax {
  name: string;
  raw: boolean;
  fields: RustFieldSyntax[];
  position: RustPosition;
}

export interface RustFileSyntax {
  structs: RustStructSyntax[];
}

export function parseRustSyntax(source: string): RustFileSyntax {
  return new RustSyntaxParser(tokenizeRust(source)).parseFile();
}

class RustSyntaxParser {
  private index = 0;

  constructor(private readonly tokens: RustToken[]) {}

  parseFile(): RustFileSyntax {
    const structs: RustStructSyntax[] = [];
    while (!this.atEnd()) {
      if (this.match(";")) continue;
      if (this.match("#")) {
        throw this.error(
          "unsupported-rust-attribute",
          "Rust attributes are not supported in V1.",
        );
      }
      this.consumeVisibility();
      if (this.match("struct")) {
        structs.push(this.parseStruct());
        continue;
      }
      const token = this.peek();
      if (
        [
          "enum",
          "type",
          "trait",
          "impl",
          "fn",
          "const",
          "static",
          "macro_rules",
        ].includes(token.text)
      ) {
        throw this.error(
          "unsupported-rust-feature",
          `Rust feature "${token.text}" is not supported in V1.`,
        );
      }
      throw this.error(
        "unsupported-rust-feature",
        `Top-level Rust item "${token.text}" is not supported in V1.`,
      );
    }
    return { structs };
  }

  private parseStruct(): RustStructSyntax {
    const nameToken = this.expectIdentifier("Expected a struct name.");
    if (this.peek().text === "<") {
      throw this.error(
        "unsupported-rust-feature",
        "Generic structs are not supported in V1.",
      );
    }
    if (this.match("(")) {
      throw this.error(
        "unsupported-rust-feature",
        "Tuple structs are not supported in V1.",
      );
    }
    this.expect("{", 'Expected "{" after a struct name.');
    const fields: RustFieldSyntax[] = [];
    while (!this.match("}")) {
      if (this.atEnd())
        throw this.error("invalid-rust-syntax", "Unterminated Rust struct.");
      this.consumeVisibility();
      const field = this.expectIdentifier("Expected a struct field name.");
      this.expect(":", 'Expected ":" after a struct field name.');
      fields.push({ name: field.text, raw: field.raw, type: this.parseType() });
      if (!this.match(",")) {
        this.expect("}", 'Expected a comma or "}" after a struct field.');
        break;
      }
    }
    return {
      name: nameToken.text,
      raw: nameToken.raw,
      fields,
      position: nameToken.position,
    };
  }

  private parseType(): RustTypeSyntax {
    if (this.match("&")) {
      if (this.match("'"))
        throw this.error(
          "unsupported-rust-type",
          "Explicit lifetimes are not supported in V1.",
        );
      if (this.match("mut"))
        throw this.error(
          "unsupported-rust-type",
          "Mutable references are not supported in V1.",
        );
      const target = this.expectIdentifier("Expected a reference target.");
      if (target.text !== "str")
        throw this.error(
          "unsupported-rust-type",
          "Only &str references are supported in V1.",
        );
      return {
        kind: "reference",
        path: ["str"],
        raw: target.raw,
        position: target.position,
      };
    }
    if (this.match("["))
      throw this.error(
        "unsupported-rust-feature",
        "Fixed-size arrays are not supported in V1.",
      );
    if (this.match("("))
      throw this.error(
        "unsupported-rust-feature",
        "Tuple types are not supported in V1.",
      );

    const first = this.expectIdentifier("Expected a Rust type.");
    const path = [first.text];
    while (this.match("::"))
      path.push(this.expectIdentifier("Expected a type path segment.").text);
    if (this.match("<")) {
      const inner = this.parseType();
      this.expect(">", 'Expected ">" after a generic Rust type.');
      if (this.peek().text === "<")
        throw this.error(
          "unsupported-rust-feature",
          "Multiple generic parameters are not supported in V1.",
        );
      return {
        kind: "generic",
        path,
        raw: first.raw,
        inner,
        position: first.position,
      };
    }
    return { kind: "named", path, raw: first.raw, position: first.position };
  }

  private consumeVisibility(): void {
    if (this.peek().text !== "pub" || this.peek().raw) return;
    this.advance();
    if (!this.match("(")) return;
    let depth = 1;
    while (depth > 0) {
      const token = this.peek();
      if (token.kind === "eof")
        throw this.error(
          "invalid-rust-syntax",
          "Unterminated Rust visibility modifier.",
        );
      this.advance();
      if (token.text === "(") depth += 1;
      if (token.text === ")") depth -= 1;
    }
  }

  private expectIdentifier(message: string): RustToken {
    const token = this.peek();
    if (token.kind !== "identifier")
      throw this.error("invalid-rust-syntax", message);
    return this.advance();
  }

  private expect(text: string, message: string): RustToken {
    if (!this.match(text)) throw this.error("invalid-rust-syntax", message);
    return this.tokens[this.index - 1]!;
  }

  private match(text: string): boolean {
    if (this.peek().text !== text) return false;
    this.index += 1;
    return true;
  }

  private advance(): RustToken {
    return this.tokens[this.index++]!;
  }

  private peek(): RustToken {
    return this.tokens[this.index]!;
  }

  private atEnd(): boolean {
    return this.peek().kind === "eof";
  }

  private error(
    code: RustSyntaxError["code"],
    message: string,
  ): RustSyntaxError {
    return new RustSyntaxError(code, message, this.peek().position);
  }
}
