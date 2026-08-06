# JSON To JSON

This route is a direct Value IR round-trip. It validates and decodes JSON,
then serializes the Value IR back to normalized JSON text. It does not infer
Shape IR, so valid mixed JSON such as `[1, "a"]` is supported here even though
the same input cannot currently be used for JSON Schema or TypeScript output.

```ts
import { convert } from "@schema-transformation-toolkit/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "json",
  input: '[{"id":1}, "mixed"]',
  irPreference: "value",
});

if (result.ok) {
  console.log(result.output);
  // '[{"id":1},"mixed"]'
}
```

The result preserves JSON data semantics and object field order. It does not
preserve source whitespace, escape spelling, number lexemes, or duplicate
object keys.
