# Rust Parser / Generator V1 Design

## 1. Goal

Add Rust data type support to Schema Transformation Toolkit.

The first version is intentionally limited to Rust syntax that represents common data models.

The goal is **not** to parse arbitrary Rust programs.

The transformation pipeline remains:

```text
Rust Source
    ↓
Rust Parser
    ↓
Canonical IR
    ↓
Rust Generator
    ↓
Rust Source
```

Rust support should follow the same architectural rule as other formats:

> Parsers preserve as much semantic information as reasonably possible.
> Generators decide how that information can be represented in the target language.

---

## 2. Scope

### 2.1 V1 Supported Syntax

V1 supports named structs:

```rust
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
    pub profile: Profile,
}
```

Supported primitive types:

```text
bool

String
str
&str

i8
i16
i32
i64
i128
isize

u8
u16
u32
u64
u128
usize

f32
f64
```

Supported container types:

```text
Option<T>
Vec<T>
```

Supported references to other named data types:

```rust
struct User {
    profile: Profile,
}
```

Multiple structs in the same source file are supported.

---

## 3. Explicitly Out of Scope

The following features are intentionally excluded from V1:

```text
enum
tuple struct
tuple
fixed-size array
type alias

generic struct
generic type
const generic

trait
impl
associated type
where clause

Serde attributes
custom attributes

HashMap
BTreeMap
Box
Rc
Arc

macro-generated types
```

Examples that should return an unsupported-feature error:

```rust
struct Page<T> {
    items: Vec<T>,
}
```

```rust
enum Status {
    Active,
    Disabled,
}
```

```rust
type UserId = u64;
```

Unsupported syntax should fail explicitly rather than silently degrading semantic information.

---

# 4. Parser Architecture

Use `syn` for Rust syntax parsing.

```text
Rust Source
    ↓
syn::parse_file()
    ↓
syn::File
    ↓
Rust Semantic Mapper
    ↓
Canonical IR
```

`syn` must remain an implementation detail of the Rust adapter.

The canonical IR must not depend on `syn` types.

Conceptually:

```rust
pub struct RustParser;

impl Parser for RustParser {
    fn parse(&self, source: &str) -> Result<Document, ParseError> {
        let file = syn::parse_file(source)?;

        map_file(file)
    }
}
```

---

# 5. Semantic Mapping

Rust syntax should first be interpreted as Rust data-model semantics before being converted into the canonical IR.

The central operation should conceptually be:

```rust
fn map_type(ty: &syn::Type) -> Result<IrType, RustParseError>;
```

This prevents Rust-specific syntax handling from leaking throughout the parser.

Example:

```text
syn::Type
    ↓
Rust type interpretation
    ↓
Canonical semantic type
```

---

# 6. Primitive Type Mapping

## Boolean

```text
bool
    ↓
Boolean
```

## String

```text
String
&str
str
    ↓
String
```

For V1, ownership and lifetime differences are intentionally discarded because they do not describe the serialized data model.

## Signed Integers

Rust integer types should preserve their numeric constraints where possible.

Example:

```text
i8
    ↓
Integer
minimum: -128
maximum: 127
```

```text
i32
    ↓
Integer
minimum: -2147483648
maximum: 2147483647
```

## Unsigned Integers

Example:

```text
u8
    ↓
Integer
minimum: 0
maximum: 255
```

```text
u32
    ↓
Integer
minimum: 0
maximum: 4294967295
```

The parser should **not** simply convert:

```text
u32 → Number
```

because doing so unnecessarily destroys information.

## Floating Point

```text
f32
f64
    ↓
Number
```

Exact floating-point representation constraints do not need to be modeled in V1.

---

# 7. Container Mapping

## Option

```rust
Option<String>
```

maps conceptually to:

```text
Optional<String>
```

Nested types should work recursively:

```rust
Option<Vec<String>>
```

becomes:

```text
Optional
    └── Array
          └── String
```

## Vec

```rust
Vec<String>
```

becomes:

```text
Array
    └── String
```

And:

```rust
Vec<Profile>
```

becomes:

```text
Array
    └── Reference(Profile)
```

---

# 8. Named Type References

Unknown simple Rust type paths should be interpreted as references to named data models.

Example:

```rust
struct User {
    profile: Profile,
}
```

becomes conceptually:

```text
Object User
    field profile
        Reference(Profile)
```

The parser does not need to require the referenced type to appear before the current struct.

For example, this is valid input:

```rust
struct User {
    profile: Profile,
}

struct Profile {
    age: u32,
}
```

Reference resolution can happen after all declarations have been parsed.

---

# 9. Rust Path Normalization

Rust types can appear using different paths:

```rust
Vec<String>

std::vec::Vec<String>

alloc::vec::Vec<String>
```

The Rust semantic mapper should normalize known standard types before converting them to IR.

Conceptually:

```text
Rust Type Path
      ↓
Path Normalization
      ↓
Known Rust Type
      ↓
Canonical IR
```

Avoid scattering string comparisons such as:

```rust
if name == "Vec" { ... }
```

throughout the parser.

Instead, centralize Rust type recognition.

---

# 10. Struct Mapping

Given:

```rust
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: Option<String>,
}
```

produce conceptually:

```text
Object: User

fields:
  id:
    Integer
    minimum: 0
    maximum: 18446744073709551615

  name:
    String

  email:
    Optional<String>
```

Visibility modifiers do not affect the data model in V1.

Therefore:

```rust
pub name: String
```

and:

```rust
name: String
```

have equivalent IR semantics.

---

# 11. Generator Architecture

The generator performs the inverse transformation:

```text
Canonical IR
    ↓
Rust Type Selection
    ↓
Rust Syntax Generation
    ↓
Formatting
    ↓
Rust Source
```

Prefer generating Rust tokens/AST using `quote` rather than manually concatenating source strings.

Conceptually:

```rust
pub struct RustGenerator;

impl Generator for RustGenerator {
    fn generate(&self, document: &Document) -> Result<String, GenerateError> {
        // IR → Rust representation
        // Rust representation → tokens
        // tokens → formatted source
    }
}
```

---

# 12. Rust Type Selection Policy

Some IR types have an exact Rust representation:

```text
Boolean        → bool
String         → String
Optional<T>    → Option<T>
Array<T>       → Vec<T>
Reference(Foo) → Foo
```

Numeric types require a selection policy.

For example, if IR contains:

```text
Integer
minimum: 0
maximum: 255
```

the generator may select:

```rust
u8
```

Similarly:

```text
0..65535
→ u16
```

If the IR only specifies:

```text
Integer
```

without enough constraints to infer a narrower representation, V1 should use a stable default:

```rust
i64
```

The important rule is:

> Rust numeric type selection is a generator policy, not an IR concern.

---

# 13. Generated Struct Style

V1 should generate simple public data models.

Example IR:

```text
Object User

id: Integer
name: String
email: Optional<String>
roles: Array<String>
```

generates:

```rust
pub struct User {
    pub id: i64,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
}
```

Using `pub` consistently avoids introducing configuration decisions in V1.

Serde derives should not be generated yet.

For example, V1 should **not** automatically produce:

```rust
#[derive(Serialize, Deserialize)]
```

because that introduces a dependency and serialization semantics outside the initial scope.

---

# 14. Errors

Rust-specific parsing errors should distinguish between invalid Rust and valid-but-unsupported Rust.

Conceptually:

```rust
enum RustParseError {
    SyntaxError(...),

    UnsupportedFeature {
        feature: RustFeature,
    },

    UnsupportedType {
        type_name: String,
    },

    InvalidDataModel(...),
}
```

Possible features:

```text
Enum
Generic
TupleStruct
TypeAlias
Map
Attribute
ConstGeneric
```

This distinction is important for future tooling and UI messages.

For example:

```text
Invalid Rust syntax
```

is fundamentally different from:

```text
Valid Rust, but generic structs are not supported yet.
```

---

# 15. Testing Strategy

Tests should focus on semantic equivalence rather than source-text equality.

Primary invariant:

```text
Rust
 ↓
IR₁
 ↓
Rust
 ↓
IR₂

IR₁ == IR₂
```

Do not require:

```text
source₁ == source₂
```

because formatting, visibility, and other non-semantic details may differ.

---

# 16. Test Fixtures

Start with small semantic fixtures.

```text
fixtures/rust/

primitive.rs
integer.rs
optional.rs
array.rs
nested.rs
multiple_structs.rs
references.rs
unsupported_enum.rs
unsupported_generic.rs
```

Example:

### optional.rs

```rust
struct User {
    name: String,
    email: Option<String>,
}
```

Test:

```text
Rust
→ IR
→ Rust
→ IR

IR₁ == IR₂
```

---

# 17. Cross-Format Tests

Rust support should also be tested against existing adapters.

Important paths:

```text
Rust
→ IR
→ TypeScript

Rust
→ IR
→ JSON Schema

Rust
→ IR
→ Zod
```

And the reverse:

```text
TypeScript
→ IR
→ Rust

JSON Schema
→ IR
→ Rust
```

These tests are particularly valuable because they reveal semantic information loss between type systems.

---

# 18. First End-to-End Fixture

The first milestone should successfully process:

```rust
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
    pub profile: Profile,
}

pub struct Profile {
    pub age: u32,
}
```

The following transformations should work:

```text
Rust → IR

Rust → TypeScript
Rust → JSON Schema

TypeScript → Rust
JSON Schema → Rust

Rust → Rust
```

---

# 19. Implementation Plan

## Phase 1 — Parser Skeleton

Add Rust parser module and dependencies.

Implement:

```text
source
→ syn::File
→ declarations
```

No complex semantic mapping yet.

## Phase 2 — Primitive Types

Implement:

```text
bool
String
integer types
floating-point types
```

Include integer constraints.

## Phase 3 — Composite Types

Implement recursive mapping for:

```text
Option<T>
Vec<T>
named references
```

## Phase 4 — Structs

Implement named-field structs and multiple declarations.

At this point:

```text
Rust → IR
```

should be usable.

## Phase 5 — Generator

Implement:

```text
IR object → struct
Boolean → bool
String → String
Integer → Rust integer
Number → f64
Optional → Option
Array → Vec
Reference → named type
```

## Phase 6 — Round-Trip Tests

Establish:

```text
Rust → IR → Rust → IR
```

semantic equivalence tests.

## Phase 7 — Cross-Format Tests

Test:

```text
Rust ↔ TypeScript
Rust ↔ JSON Schema
```

Then expand to other existing adapters.

---

# 20. Future Extensions

After V1 is stable, extend Rust support incrementally.

Suggested order:

```text
V1.1
├── simple enums
├── tuples
├── tuple structs
└── fixed-size arrays

V1.2
├── serde(rename)
├── serde(rename_all)
└── serde(default)

V1.3
├── type aliases
├── HashMap
├── BTreeMap
└── Box

V2
├── tagged enums
├── untagged enums
├── serde(flatten)
├── transparent types
└── richer serialization semantics
```

Generics should be treated as a separate design problem rather than casually added to the parser.

---

# 21. Design Principles

Rust support should follow several rules.

### Preserve semantics before syntax

```text
Rust syntax
→ semantic meaning
→ IR
```

Do not attempt source-to-source translation.

### Do not leak Rust into the IR

The IR should not contain concepts such as:

```text
syn::Type
RustPath
RustStruct
Vec
Option
```

unless they correspond to genuinely language-independent concepts.

### Do not silently lose information

If something cannot be represented safely:

```text
explicit unsupported error
```

is preferable to:

```text
guess → incorrect IR
```

### Keep V1 deliberately small

The success criterion is not:

> Support the Rust type system.

It is:

> Reliably transform common Rust data models through the toolkit's canonical IR.

---

# 22. V1 Definition of Done

Rust V1 is complete when this model:

```rust
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
    pub profile: Profile,
}

pub struct Profile {
    pub age: u32,
}
```

can reliably participate in:

```text
                    ┌→ TypeScript
                    │
Rust → Canonical IR ├→ JSON Schema
                    │
                    ├→ Zod
                    │
                    └→ Rust
```

and existing supported schemas can generate equivalent Rust data models.

At that point, Rust becomes a real toolkit adapter rather than an isolated parser/generator implementation.
