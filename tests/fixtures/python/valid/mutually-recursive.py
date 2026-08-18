@dataclass
class Parent:
    child: Child | None

@dataclass
class Child:
    parent: Parent | None
