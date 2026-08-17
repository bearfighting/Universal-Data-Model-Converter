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
  arguments?: RustTypeSyntax[];
  position: RustPosition;
}

export interface RustFieldSyntax {
  name: string;
  raw: boolean;
  type: RustTypeSyntax;
}

export interface RustStructSyntax {
  kind: "struct";
  name: string;
  raw: boolean;
  fields: RustFieldSyntax[];
  position: RustPosition;
}

export interface RustEnumVariantSyntax {
  name: string;
  raw: boolean;
  position: RustPosition;
}

export interface RustEnumSyntax {
  kind: "enum";
  name: string;
  raw: boolean;
  variants: RustEnumVariantSyntax[];
  position: RustPosition;
}

export type RustItemSyntax = RustStructSyntax | RustEnumSyntax;

export interface RustFileSyntax {
  items: RustItemSyntax[];
}

export function parseRustSyntax(source: string): RustFileSyntax {
  return new RustSyntaxParser(tokenizeRust(source)).parseFile();
}

class RustSyntaxParser {
  private index = 0;

  constructor(private readonly tokens: RustToken[]) {}

  parseFile(): RustFileSyntax {
    const items: RustItemSyntax[] = [];
    while (!this.atEnd()) {
      if (this.match(";")) continue;
      if (this.match("use")) {
        this.skipUseDeclaration();
        continue;
      }
      if (this.match("#")) {
        throw this.error(
          "unsupported-rust-attribute",
          "Rust attributes are not supported in V1.",
        );
      }
      this.consumeVisibility();
      if (this.match("struct")) {
        items.push(this.parseStruct());
        continue;
      }
      if (this.match("enum")) {
        items.push(this.parseEnum());
        continue;
      }
      const token = this.peek();
      if (
        [
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
    return { items };
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
      kind: "struct",
      name: nameToken.text,
      raw: nameToken.raw,
      fields,
      position: nameToken.position,
    };
  }

  private parseEnum(): RustEnumSyntax {
    const nameToken = this.expectIdentifier("Expected an enum name.");
    if (this.peek().text === "<") {
      throw this.error(
        "unsupported-rust-feature",
        "Generic enums are not supported.",
      );
    }
    this.expect("{", 'Expected "{" after an enum name.');
    const variants: RustEnumVariantSyntax[] = [];
    while (!this.match("}")) {
      if (this.atEnd())
        throw this.error("invalid-rust-syntax", "Unterminated Rust enum.");
      const variant = this.expectIdentifier("Expected an enum variant name.");
      if (this.peek().text === "=")
        throw this.error(
          "unsupported-rust-feature",
          "Rust enum discriminants are not supported.",
        );
      if (this.peek().text === "(" || this.peek().text === "{")
        throw this.error(
          "unsupported-rust-feature",
          "Only unit Rust enum variants are supported.",
        );
      variants.push({
        name: variant.text,
        raw: variant.raw,
        position: variant.position,
      });
      if (!this.match(",")) {
        this.expect("}", 'Expected a comma or "}" after an enum variant.');
        break;
      }
    }
    return {
      kind: "enum",
      name: nameToken.text,
      raw: nameToken.raw,
      variants,
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
      const arguments_: RustTypeSyntax[] = [this.parseType()];
      while (this.match(",")) {
        if (this.peek().text === ">") break;
        arguments_.push(this.parseType());
      }
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
        arguments: arguments_,
        position: first.position,
      };
    }
    return { kind: "named", path, raw: first.raw, position: first.position };
  }

  private skipUseDeclaration(): void {
    let depth = 0;
    const tokens: RustToken[] = [];
    while (!this.atEnd()) {
      const token = this.advance();
      tokens.push(token);
      if (token.text === "as")
        throw new RustSyntaxError(
          "unsupported-rust-feature",
          "Rust use aliases are not supported.",
          token.position,
        );
      if (token.text === "{") depth += 1;
      if (token.text === "}") depth -= 1;
      if (token.text === ";" && depth === 0) {
        if (!isSupportedUse(tokens.slice(0, -1)))
          throw new RustSyntaxError(
            "unsupported-rust-feature",
            "Only canonical std, alloc, and core Rust imports are supported.",
            tokens[0]?.position ?? token.position,
          );
        return;
      }
    }
    throw this.error("invalid-rust-syntax", 'Expected ";" after a Rust use.');
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

function isSupportedUse(tokens: RustToken[]): boolean {
  const text = tokens.map((token) => token.text).join("");
  return (
    /^(?:std|alloc)::collections::(?:HashMap|BTreeMap)$/u.test(text) ||
    /^(?:std|alloc)::string::String$/u.test(text) ||
    /^core::option::Option$/u.test(text) ||
    /^(?:std|alloc)::collections::\{(?:HashMap|BTreeMap)(?:,(?:HashMap|BTreeMap))*[,]?\}$/u.test(
      text,
    )
  );
}
