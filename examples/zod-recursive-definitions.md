# Recursive Zod definitions

Shared local references become independently exported schema constants. Zod
references are emitted through `z.lazy(...)`, so recursive definitions do not
depend on declaration order at module initialization time.
