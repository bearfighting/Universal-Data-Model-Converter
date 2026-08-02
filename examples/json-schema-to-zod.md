# JSON Schema to Zod

The JSON Schema parser's supported constraint subset is passed to the Zod 4
generator. Compatible constraints become Zod checks; unsupported target
semantics remain visible through conversion diagnostics.

```ts
const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "zod",
  input: JSON.stringify({
    title: "User",
    type: "object",
    properties: { email: { type: "string", format: "email" } },
    required: ["email"],
  }),
  name: "User",
});
```
