@dataclass
class DefaultFactory:
    tags: list[str] = field(default_factory=list)
