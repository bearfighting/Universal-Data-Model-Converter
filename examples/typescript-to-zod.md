# TypeScript to Zod

The TypeScript parser accepts its documented schema-oriented subset and the
Zod generator emits a runtime validator plus an inferred type.

```ts
const result = convert({
  sourceFormat: "typescript",
  targetFormat: "zod",
  input: "export type User = { id: number; name?: string };",
  name: "User",
});
```
