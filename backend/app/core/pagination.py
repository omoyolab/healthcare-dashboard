"""Shared pagination arithmetic, so every list endpoint behaves identically."""

from dataclasses import dataclass
from math import ceil

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


@dataclass(frozen=True, slots=True)
class PageRequest:
    page: int = 1
    page_size: int = DEFAULT_PAGE_SIZE

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def total_pages(total_items: int, page_size: int) -> int:
    return ceil(total_items / page_size) if total_items else 0
