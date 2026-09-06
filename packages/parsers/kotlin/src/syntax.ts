import { KotlinSyntaxError, type KotlinPosition } from "./failure.js";

interface Token {
  value: string;
  position: KotlinPosition;
}
export interface KotlinPropertySyntax {
  name: string;
  type: KotlinTypeSyntax;
  position: KotlinPosition;
}
export interface KotlinTypeSyntax {
  name: string;
  arguments?: KotlinTypeSyntax[];
  nullable: boolean;
  position: KotlinPosition;
}
export interface KotlinDataClassSyntax {
  kind: "data-class";
  name: string;
  properties: KotlinPropertySyntax[];
  position: KotlinPosition;
}
export interface KotlinEnumSyntax {
  kind: "enum";
  name: string;
  members: string[];
  position: KotlinPosition;
}
export type KotlinDeclarationSyntax = KotlinDataClassSyntax | KotlinEnumSyntax;

const unsupportedTopLevel = new Set([
  "class",
  "interface",
  "sealed",
  "object",
  "typealias",
  "fun",
  "val",
  "var",
  "annotation",
  "import",
  "package",
]);

const kotlinKeywords = new Set([
  "as",
  "break",
  "class",
  "continue",
  "do",
  "else",
  "false",
  "for",
  "fun",
  "if",
  "in",
  "interface",
  "is",
  "null",
  "object",
  "package",
  "return",
  "super",
  "this",
  "throw",
  "true",
  "try",
  "typealias",
  "typeof",
  "val",
  "var",
  "when",
  "while",
  "by",
  "catch",
  "constructor",
  "delegate",
  "dynamic",
  "field",
  "file",
  "finally",
  "get",
  "import",
  "init",
  "param",
  "property",
  "receiver",
  "set",
  "setparam",
  "where",
  "actual",
  "abstract",
  "annotation",
  "companion",
  "const",
  "crossinline",
  "data",
  "enum",
  "expect",
  "external",
  "final",
  "infix",
  "inline",
  "inner",
  "internal",
  "lateinit",
  "noinline",
  "open",
  "operator",
  "override",
  "private",
  "protected",
  "public",
  "reified",
  "sealed",
  "suspend",
  "tailrec",
  "vararg",
  "it",
]);

export function parseKotlinSyntax(input: string): KotlinDeclarationSyntax[] {
  const tokens = tokenize(input);
  let index = 0;
  const declarations: KotlinDeclarationSyntax[] = [];
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const expect = (value: string): Token => {
    const token = take();
    if (!token || token.value !== value)
      fail("malformed-kotlin-model", `Expected "${value}".`, token?.position);
    return token;
  };
  while (peek()) {
    const start = peek()!.position;
    const modifier = take()!;
    if (modifier.value === "@" || unsupportedTopLevel.has(modifier.value))
      fail(
        "unsupported-kotlin-declaration",
        `Kotlin declaration "${modifier.value}" is not supported in V1.`,
        modifier.position,
      );
    if (modifier.value !== "data" && modifier.value !== "enum")
      fail(
        "unsupported-kotlin-declaration",
        `Unsupported Kotlin declaration "${modifier.value}".`,
        modifier.position,
      );
    if (modifier.value === "data") {
      expect("class");
      const name = identifier(take(), "Kotlin data class name");
      if (peek()?.value === "<")
        fail(
          "unsupported-kotlin-generic",
          "Generic Kotlin declarations are not supported in V1.",
          peek()!.position,
        );
      expect("(");
      const properties = parseProperties(take, peek, expect);
      expect(")");
      if (properties.length === 0)
        fail(
          "empty-kotlin-data-class",
          "Kotlin data classes must declare at least one primary-constructor property.",
          start,
        );
      if (peek()?.value === "{") skipEmptyBody(take, peek, expect);
      declarations.push({
        kind: "data-class",
        name,
        properties,
        position: start,
      });
    } else {
      expect("class");
      const name = identifier(take(), "Kotlin enum name");
      if (peek()?.value === "<" || peek()?.value === "(")
        fail(
          "unsupported-kotlin-enum",
          "Parameterized Kotlin enums are not supported in V1.",
          peek()!.position,
        );
      expect("{");
      const members: string[] = [];
      while (peek() && peek()!.value !== "}") {
        const member = identifier(take(), "Kotlin enum member");
        if (members.includes(member))
          fail(
            "duplicate-kotlin-member",
            `Duplicate Kotlin enum member "${member}".`,
          );
        members.push(member);
        if (peek()?.value === "(")
          fail(
            "unsupported-kotlin-enum",
            "Enum constructors are not supported in V1.",
            peek()!.position,
          );
        if (peek()?.value === ";") {
          take();
          if (peek()?.value !== "}")
            fail(
              "unsupported-kotlin-enum",
              "Enum bodies are not supported in V1.",
              peek()!.position,
            );
        } else if (peek()?.value === ",") take();
        else if (peek()?.value !== "}")
          fail(
            "malformed-kotlin-model",
            "Expected comma or closing brace after enum member.",
            peek()!.position,
          );
      }
      expect("}");
      if (members.length === 0)
        fail(
          "empty-kotlin-enum",
          "Kotlin enums must contain at least one member.",
        );
      declarations.push({ kind: "enum", name, members, position: start });
    }
  }
  return declarations;
}

function parseProperties(
  take: () => Token | undefined,
  peek: () => Token | undefined,
  expect: (value: string) => Token,
): KotlinPropertySyntax[] {
  const properties: KotlinPropertySyntax[] = [];
  while (peek() && peek()!.value !== ")") {
    const marker = take()!;
    if (marker.value === "@")
      fail(
        "unsupported-kotlin-declaration",
        "Annotations are not supported in V1.",
        marker.position,
      );
    if (marker.value !== "val" && marker.value !== "var")
      fail(
        "malformed-kotlin-model",
        "Data class constructor parameters must be val or var properties.",
        marker.position,
      );
    const name = identifier(take(), "Kotlin property name");
    expect(":");
    const type = parseType(take, peek, expect);
    if (peek()?.value === "=")
      fail(
        "unsupported-kotlin-declaration",
        "Default property values are not supported in V1.",
        peek()!.position,
      );
    properties.push({ name, type, position: marker.position });
    if (peek()?.value === ",") take();
    else if (peek()?.value !== ")")
      fail(
        "malformed-kotlin-model",
        "Expected comma or closing parenthesis after property.",
        peek()!.position,
      );
  }
  return properties;
}

function parseType(
  take: () => Token | undefined,
  peek: () => Token | undefined,
  expect: (value: string) => Token,
): KotlinTypeSyntax {
  const token = take();
  const name = identifier(token, "Kotlin type");
  if (name.includes("."))
    fail(
      "unsupported-kotlin-type",
      "Qualified Kotlin types are not supported in V1.",
      token?.position,
    );
  const args: KotlinTypeSyntax[] = [];
  if (peek()?.value === "<") {
    expect("<");
    while (peek() && peek()!.value !== ">") {
      args.push(parseType(take, peek, expect));
      if (peek()?.value === ",") take();
      else if (peek()?.value !== ">")
        fail(
          "malformed-kotlin-model",
          "Expected comma or closing angle bracket.",
          peek()!.position,
        );
    }
    expect(">");
  }
  const nullable = peek()?.value === "?";
  if (nullable) take();
  return {
    name,
    ...(args.length ? { arguments: args } : {}),
    nullable,
    position: token!.position,
  };
}

function skipEmptyBody(
  take: () => Token | undefined,
  peek: () => Token | undefined,
  expect: (value: string) => Token,
): void {
  expect("{");
  if (peek()?.value !== "}")
    fail(
      "unsupported-kotlin-declaration",
      "Data class bodies are not supported in V1.",
      peek()?.position,
    );
  expect("}");
}

function identifier(token: Token | undefined, context: string): string {
  if (!token)
    fail(
      "invalid-kotlin-identifier",
      `${context} must be a Kotlin identifier.`,
    );
  const escaped = token.value.match(/^`([^`]+)`$/u);
  if (escaped) {
    if (
      !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(escaped[1]!) ||
      !kotlinKeywords.has(escaped[1]!)
    )
      fail(
        "invalid-kotlin-identifier",
        `${context} may only escape a Kotlin keyword in V1.`,
        token.position,
      );
    return escaped[1]!;
  }
  if (
    !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(token.value) ||
    kotlinKeywords.has(token.value)
  )
    fail(
      "invalid-kotlin-identifier",
      `${context} must be a Kotlin identifier.`,
      token.position,
    );
  return token.value;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let column = 1;
  const advance = (text: string) => {
    for (const char of text) {
      if (char === "\n") {
        line++;
        column = 1;
      } else column++;
    }
    i += text.length;
  };
  while (i < input.length) {
    if (/\s/u.test(input[i]!)) {
      advance(input[i]!);
      continue;
    }
    if (input.startsWith("//", i)) {
      const end = input.indexOf("\n", i);
      advance(input.slice(i, end < 0 ? input.length : end));
      continue;
    }
    if (input.startsWith("/*", i)) {
      const end = input.indexOf("*/", i + 2);
      if (end < 0)
        fail("malformed-kotlin-model", "Unclosed block comment.", {
          offset: i,
          line,
          column,
        });
      advance(input.slice(i, end + 2));
      continue;
    }
    const position = { offset: i, line, column };
    const char = input[i]!;
    if (char === "`") {
      const end = input.indexOf("`", i + 1);
      if (end < 0)
        fail(
          "malformed-kotlin-model",
          "Unclosed escaped identifier.",
          position,
        );
      const text = input.slice(i, end + 1);
      tokens.push({ value: text, position });
      advance(text);
      continue;
    }
    if (/[A-Za-z_]/u.test(char)) {
      const match = input.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/u)![0];
      tokens.push({ value: match, position });
      advance(match);
      continue;
    }
    if ("<>(){},:?;=@".includes(char)) {
      tokens.push({ value: char, position });
      advance(char);
      continue;
    }
    fail(
      "malformed-kotlin-model",
      `Unsupported Kotlin token "${char}".`,
      position,
    );
  }
  return tokens;
}

function fail(
  code: KotlinSyntaxError["code"],
  message: string,
  position?: KotlinPosition,
): never {
  throw new KotlinSyntaxError(code, message, position);
}
