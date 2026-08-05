# @schema-transformation-toolkit/parser-zod

Static Zod 4 schema-expression parser for the shared schema IR.

The parser reads TypeScript or JavaScript source with the TypeScript compiler;
it never executes source code. The supported subset covers canonical schema
expressions such as `z.object`, `z.array`, `z.tuple`, `z.union`, `z.enum`,
references, `z.lazy`, optional and nullable fields, and constraints and
portable metadata (`describe` and static `default`) represented by the shared
Constraint IR.

Static `.default(value)` is represented as a default annotation while the
Shape IR keeps the post-default field required. Zod permits the input field to
be omitted, so the parser emits a semantic note when this distinction cannot be
represented by the shared IR.

Sources must use one canonical Zod binding: `import { z } from "zod"` or
`import * as z from "zod"`. Optional presence is supported for object fields
and tuple elements; it is rejected for standalone root or definition schemas.
Implicit entry selection uses a unique exported `*Schema` binding, or a
unique unexported binding whose name ends in `Schema`; otherwise use
`options.entry`. `z.union()` requires at least two static members.

Dynamic schema factories, `refine`, `transform`, `preprocess`, `pipe`,
`extend`, `merge`, and other runtime-dependent expressions fail explicitly with
structured diagnostics.

```ts
import { tryInferZodDocumentWithOptions } from "@schema-transformation-toolkit/parser-zod";

const result = tryInferZodDocumentWithOptions(
  `import { z } from "zod";
   export const UserSchema = z.object({
     name: z.string().min(1),
     age: z.number().int().optional(),
   });`,
  { name: "User" },
);
```
