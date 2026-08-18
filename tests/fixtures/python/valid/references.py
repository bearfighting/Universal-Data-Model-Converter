@dataclass
class Address:
    city: str

@dataclass
class User:
    address: Address
