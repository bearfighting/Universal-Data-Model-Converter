import { JavaSyntaxError, type JavaPosition } from "./failure.js";

const JAVA_RESERVED_IDENTIFIERS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "void",
  "volatile",
  "while",
  "record",
  "sealed",
  "permits",
  "var",
  "true",
  "false",
  "null",
  "_",
]);
const JAVA_PRIMITIVE_TYPES = new Set([
  "byte",
  "short",
  "int",
  "long",
  "float",
  "double",
  "boolean",
]);

interface Token {
  text: string;
  position: JavaPosition;
}

export interface JavaTypeSyntax {
  kind: "name" | "array" | "generic";
  name?: string;
  element?: JavaTypeSyntax;
  arguments?: JavaTypeSyntax[];
  position: JavaPosition;
}

export interface JavaComponentSyntax {
  name: string;
  type: JavaTypeSyntax;
  position: JavaPosition;
}

export interface JavaRecordSyntax {
  kind: "record";
  name: string;
  public: boolean;
  components: JavaComponentSyntax[];
  position: JavaPosition;
}

export interface JavaEnumSyntax {
  kind: "enum";
  name: string;
  public: boolean;
  variants: string[];
  position: JavaPosition;
}

export interface JavaFieldSyntax {
  name: string;
  type: JavaTypeSyntax;
  position: JavaPosition;
}

export interface JavaClassSyntax {
  kind: "class";
  name: string;
  public: boolean;
  fields: JavaFieldSyntax[];
  position: JavaPosition;
}

export type JavaDeclarationSyntax =
  JavaRecordSyntax | JavaEnumSyntax | JavaClassSyntax;

export interface JavaFileSyntax {
  declarations: JavaDeclarationSyntax[];
}

export function parseJavaSyntax(source: string): JavaFileSyntax {
  return new Parser(tokenize(source)).parse();
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  const advance = (text: string) => {
    for (const character of text) {
      if (character === "\n") {
        line++;
        column = 1;
      } else column++;
    }
    offset += text.length;
  };

  while (offset < source.length) {
    const position = { offset, line, column };
    const rest = source.slice(offset);
    const whitespace = rest.match(/^\s+/u);
    if (whitespace) {
      advance(whitespace[0]);
      continue;
    }
    const comment = rest.match(/^\/\/[^\n]*|^\/\*[\s\S]*?\*\//u);
    if (comment) {
      advance(comment[0]);
      continue;
    }
    const identifier = rest.match(/^[A-Za-z_$][A-Za-z0-9_$]*/u);
    if (identifier) {
      tokens.push({ text: identifier[0], position });
      advance(identifier[0]);
      continue;
    }
    const number = rest.match(/^\d+(?:\.\d+)?/u);
    if (number) {
      tokens.push({ text: number[0], position });
      advance(number[0]);
      continue;
    }
    const quoted = rest.match(/^"(?:\\.|[^"\\])*"|^'(?:\\.|[^'\\])*'/u);
    if (quoted) {
      tokens.push({ text: quoted[0], position });
      advance(quoted[0]);
      continue;
    }
    const punctuation = rest[0]!;
    if ("{}()[],;<>.?@*=".includes(punctuation)) {
      tokens.push({ text: punctuation, position });
      advance(punctuation);
      continue;
    }
    throw new JavaSyntaxError(
      "invalid-java-syntax",
      `Unexpected Java character "${punctuation}".`,
      position,
    );
  }
  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): JavaFileSyntax {
    const declarations: JavaDeclarationSyntax[] = [];
    while (!this.end()) {
      if (this.skipPackageOrImport()) continue;
      if (this.end()) break;
      const modifiers = this.parseModifiers();
      if (this.match("record")) {
        if (modifiers.some((modifier) => modifier !== "public"))
          throw this.error(
            "unsupported-java-feature",
            "Only public and package-private Java records are supported in V1.",
          );
        declarations.push(this.parseRecord(modifiers.includes("public")));
        continue;
      }
      if (this.match("enum")) {
        if (modifiers.some((modifier) => modifier !== "public"))
          throw this.error(
            "unsupported-java-feature",
            "Only public and package-private Java enums are supported in V1.",
          );
        declarations.push(this.parseEnum(modifiers.includes("public")));
        continue;
      }
      if (this.match("class")) {
        if (modifiers.some((modifier) => modifier !== "public"))
          throw this.error(
            "unsupported-java-class",
            "Only public and package-private Java classes are supported in V1.",
          );
        declarations.push(this.parseClass(modifiers.includes("public")));
        continue;
      }
      const token = this.peek();
      if (
        token?.text === "class" ||
        token?.text === "interface" ||
        token?.text === "enum"
      ) {
        throw this.error(
          "unsupported-java-feature",
          `Java ${token.text} declarations are not supported in Java V1.`,
        );
      }
      throw this.error(
        "unsupported-java-feature",
        `Top-level Java syntax "${token?.text ?? ""}" is not supported in V1.`,
      );
    }
    return { declarations };
  }

  private skipPackageOrImport(): boolean {
    if (!this.match("package") && !this.match("import")) return false;
    while (!this.end() && !this.match(";")) this.index++;
    if (this.end() && this.tokens[this.index - 1]?.text !== ";")
      throw this.error(
        "invalid-java-syntax",
        'Expected ";" after a Java package or import declaration.',
      );
    return true;
  }

  private parseModifiers(): string[] {
    const modifiers: string[] = [];
    while (true) {
      const token = this.peek()?.text;
      if (
        token === "public" ||
        token === "private" ||
        token === "protected" ||
        token === "static" ||
        token === "final" ||
        token === "abstract" ||
        token === "sealed" ||
        token === "non-sealed" ||
        token === "strictfp"
      ) {
        modifiers.push(token);
        this.index++;
        continue;
      }
      if (token === "@")
        throw this.error(
          "unsupported-java-feature",
          "Java annotations are not supported in V1.",
        );
      return modifiers;
    }
  }

  private parseRecord(publicRecord: boolean): JavaRecordSyntax {
    const name = this.expectIdentifier("Expected a Java record name.");
    if (this.peek()?.text === "<")
      throw this.error(
        "unsupported-java-generic",
        "Generic Java records are not supported in V1.",
      );
    this.expect("(", 'Expected "(" after a Java record name.');
    const components: JavaComponentSyntax[] = [];
    while (this.peek()?.text !== ")") {
      if (this.match("@"))
        throw this.error(
          "unsupported-java-feature",
          "Record component annotations are not supported in V1.",
        );
      const type = this.parseType();
      const component = this.expectIdentifier(
        "Expected a record component name.",
      );
      if (this.match("."))
        throw this.error(
          "invalid-java-syntax",
          "Record component names must be simple identifiers.",
        );
      components.push({
        name: component.text,
        type,
        position: component.position,
      });
      if (!this.match(",") && this.peek()?.text !== ")")
        throw this.error(
          "invalid-java-syntax",
          'Expected "," or ")" after a record component.',
        );
    }
    this.expect(")", 'Expected ")" after a Java record header.');
    this.expect("{", 'Expected "{" after a Java record header.');
    if (!this.match("}"))
      throw this.error(
        "unsupported-java-feature",
        "Record bodies with methods, constructors, or fields are not supported in V1.",
      );
    return {
      kind: "record",
      name: name.text,
      public: publicRecord,
      components,
      position: name.position,
    };
  }

  private parseEnum(publicEnum: boolean): JavaEnumSyntax {
    const name = this.expectIdentifier("Expected a Java enum name.");
    this.expect("{", 'Expected "{" after a Java enum name.');
    if (this.match("}"))
      throw this.error(
        "empty-java-enum",
        "Java enums must declare at least one variant.",
      );

    const variants: string[] = [];
    const seen = new Set<string>();
    while (!this.end() && this.peek()?.text !== "}") {
      const variant = this.expectIdentifier("Expected a Java enum variant.");
      if (seen.has(variant.text))
        throw this.error(
          "duplicate-java-enum-variant",
          `Duplicate Java enum variant "${variant.text}".`,
        );
      seen.add(variant.text);
      variants.push(variant.text);
      if (this.peek()?.text === "(" || this.peek()?.text === "{")
        throw this.error(
          "unsupported-java-enum",
          "Java enum variants with fields, constructors, or bodies are not supported in V1.",
        );
      if (this.match(";"))
        throw this.error(
          "unsupported-java-enum",
          "Java enum fields and methods are not supported in V1.",
        );
      if (!this.match(",") && this.peek()?.text !== "}")
        throw this.error(
          "invalid-java-syntax",
          'Expected "," or "}" after a Java enum variant.',
        );
    }
    this.expect("}", 'Expected "}" after Java enum variants.');
    return {
      kind: "enum",
      name: name.text,
      public: publicEnum,
      variants,
      position: name.position,
    };
  }

  private parseClass(publicClass: boolean): JavaClassSyntax {
    const name = this.expectIdentifier("Expected a Java class name.");
    if (this.peek()?.text === "<")
      throw this.error(
        "unsupported-java-generic",
        "Generic Java classes are not supported in V1.",
      );
    if (this.peek()?.text === "extends" || this.peek()?.text === "implements")
      throw this.error(
        "unsupported-java-class",
        "Java class inheritance and interfaces are not supported in V1.",
      );
    this.expect("{", 'Expected "{" after a Java class name.');
    const fields: JavaFieldSyntax[] = [];
    const seen = new Set<string>();
    while (!this.end() && this.peek()?.text !== "}") {
      if (this.peek()?.text === "@")
        throw this.error(
          "unsupported-java-class-member",
          "Java class field annotations are not supported in V1.",
        );
      if (["class", "interface", "enum"].includes(this.peek()?.text ?? ""))
        throw this.error(
          "unsupported-java-class-member",
          "Nested Java declarations are not supported in V1.",
        );
      const modifiers = this.parseClassFieldModifiers();
      if (
        modifiers.some((modifier) =>
          ["static", "transient", "volatile", "abstract"].includes(modifier),
        )
      )
        throw this.error(
          "unsupported-java-class-member",
          "Static, transient, volatile, and abstract class members are not supported in V1.",
        );
      if (this.peek()?.text === "{")
        throw this.error(
          "unsupported-java-class-member",
          "Java initializer blocks are not supported in V1.",
        );
      const type = this.parseType();
      if (this.peek()?.text === "(")
        throw this.error(
          "unsupported-java-class-member",
          "Java methods and constructors are not supported in V1.",
        );
      const field = this.expectIdentifier("Expected a Java class field name.");
      if (this.peek()?.text === "(")
        throw this.error(
          "unsupported-java-class-member",
          "Java methods and constructors are not supported in V1.",
        );
      if (this.match("="))
        throw this.error(
          "unsupported-java-class-member",
          "Java field initializers are not supported in V1.",
        );
      if (!this.match(";"))
        throw this.error(
          "invalid-java-syntax",
          'Expected ";" after a Java class field.',
        );
      if (seen.has(field.text))
        throw this.error(
          "duplicate-java-field",
          `Duplicate Java class field "${field.text}".`,
        );
      seen.add(field.text);
      fields.push({ name: field.text, type, position: field.position });
    }
    this.expect("}", 'Expected "}" after Java class fields.');
    return {
      kind: "class",
      name: name.text,
      public: publicClass,
      fields,
      position: name.position,
    };
  }

  private parseClassFieldModifiers(): string[] {
    const modifiers: string[] = [];
    while (
      [
        "public",
        "protected",
        "private",
        "final",
        "static",
        "transient",
        "volatile",
        "abstract",
      ].includes(this.peek()?.text ?? "")
    )
      modifiers.push(this.peekAndAdvance());
    return modifiers;
  }

  private parseType(): JavaTypeSyntax {
    if (this.match("?"))
      throw this.error(
        "unsupported-java-generic",
        "Java wildcard types are not supported in V1.",
      );
    const first = this.expectIdentifier("Expected a Java type.", true);
    const parts = [first.text];
    while (this.match("."))
      parts.push(
        this.expectIdentifier("Expected a qualified Java type name.").text,
      );
    const name = parts.join(".");
    let type: JavaTypeSyntax = { kind: "name", name, position: first.position };
    if (this.match("<")) {
      const typeArguments: JavaTypeSyntax[] = [];
      while (this.peek()?.text !== ">") {
        typeArguments.push(this.parseType());
        if (!this.match(",") && this.peek()?.text !== ">")
          throw this.error(
            "invalid-java-syntax",
            'Expected "," or ">" in a Java generic type.',
          );
      }
      this.expect(">", 'Expected ">" in a Java generic type.');
      type = {
        kind: "generic",
        name,
        arguments: typeArguments,
        position: first.position,
      };
    }
    while (this.match("[")) {
      this.expect("]", 'Expected "]" after a Java array type.');
      type = { kind: "array", element: type, position: first.position };
    }
    return type;
  }

  private expectIdentifier(message: string, primitiveType = false): Token {
    const token = this.peek();
    if (!token || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(token.text))
      throw this.error("invalid-java-syntax", message);
    if (
      JAVA_RESERVED_IDENTIFIERS.has(token.text) &&
      !(primitiveType && JAVA_PRIMITIVE_TYPES.has(token.text))
    )
      throw this.error(
        "invalid-java-syntax",
        `"${token.text}" is not a valid Java identifier.`,
      );
    this.index++;
    return token;
  }

  private expect(text: string, message: string): void {
    if (!this.match(text)) throw this.error("invalid-java-syntax", message);
  }

  private match(text: string): boolean {
    if (this.peek()?.text !== text) return false;
    this.index++;
    return true;
  }

  private peekAndAdvance(): string {
    const token = this.peek();
    if (!token) return "";
    this.index++;
    return token.text;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }
  private end(): boolean {
    return this.index >= this.tokens.length;
  }

  private error(
    code:
      | "invalid-java-syntax"
      | "unsupported-java-feature"
      | "unsupported-java-generic"
      | "unsupported-java-enum"
      | "unsupported-java-class"
      | "unsupported-java-class-member"
      | "empty-java-enum"
      | "duplicate-java-enum-variant"
      | "duplicate-java-field",
    message: string,
  ): JavaSyntaxError {
    return new JavaSyntaxError(code, message, this.peek()?.position);
  }
}
