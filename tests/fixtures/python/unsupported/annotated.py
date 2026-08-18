@dataclass
class AnnotatedValue:
    value: Annotated[str, "metadata"]
