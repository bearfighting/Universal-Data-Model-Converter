# @schema-transformation-toolkit/parser-yaml

Strict JSON-compatible YAML parser for the shared Value IR and Shape IR.

The parser accepts one YAML 1.2 document containing strings, numbers,
booleans, nulls, arrays, and objects with string keys. It intentionally rejects
duplicate keys, non-string keys, multiple documents, anchors and aliases,
merge keys, explicit tags, and other YAML-specific values that cannot be
represented by the current shared IR.

Value-only conversions such as `yaml -> json` and `yaml -> yaml` do not require
Shape IR inference. Schema-producing routes infer Shape IR only when the target
requires it.

Comments, indentation, scalar style, and other source formatting are not
preserved.

```ts
import { tryParseYamlDocument } from "@schema-transformation-toolkit/parser-yaml";

const result = tryParseYamlDocument("id: 1\nname: Ada\n", {
  name: "User",
});

if (result.ok) console.log(result.value, result.document);
```
