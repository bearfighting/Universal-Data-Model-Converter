# @schema-transformation-toolkit/generator-zod

Zod 4 generator for the shared schema IR.

The generator emits a single ESM module containing exported Zod schemas. Its
default TypeScript mode also emits `z.infer` types; JavaScript mode emits the
runtime schemas only.

```ts
import { tryGenerateZod } from "@schema-transformation-toolkit/generator-zod";

const result = tryGenerateZod(document, { outputLanguage: "typescript" });
```

Generated code imports `z` from `zod`; the consuming project must install Zod 4. Zod 3 compatibility is not part of this package's current contract.

The generator supports the current shared scalar, literal, object, array,
tuple, record, union, reference, null, unknown, optional, and nullable
semantics. It maps compatible constraint IR entries and reports target
diagnostics when a constraint cannot be represented without guessing.

Object output follows constraint evidence. A `closed-object` constraint emits
`z.strictObject`. When the shared shape has no explicit openness evidence, the
generator uses a strict-object policy and reports a policy note.

This is a schema-oriented generator, not a general TypeScript or Zod code
synthesis tool. It does not parse Zod, emit transforms, custom validators,
classes, functions, or multi-file import graphs.
