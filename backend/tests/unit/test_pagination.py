"""Pagination arithmetic and the page envelope."""

import pytest

from app.core.pagination import PageRequest, total_pages
from app.schemas.common import Page


@pytest.mark.parametrize(
    ("page", "page_size", "offset"),
    [(1, 25, 0), (2, 25, 25), (3, 10, 20)],
)
def test_offset_is_zero_based(page: int, page_size: int, offset: int) -> None:
    assert PageRequest(page=page, page_size=page_size).offset == offset


@pytest.mark.parametrize(
    ("total", "page_size", "pages"),
    [(0, 25, 0), (1, 25, 1), (25, 25, 1), (26, 25, 2), (20, 3, 7)],
)
def test_total_pages_rounds_up(total: int, page_size: int, pages: int) -> None:
    assert total_pages(total, page_size) == pages


def test_envelope_flags_middle_page() -> None:
    page: Page[str] = Page.build(items=["a"], total=20, request=PageRequest(page=2, page_size=5))

    assert (page.total_pages, page.has_next, page.has_previous) == (4, True, True)


def test_envelope_flags_last_page() -> None:
    page: Page[str] = Page.build(items=["a"], total=20, request=PageRequest(page=4, page_size=5))

    assert (page.has_next, page.has_previous) == (False, True)


def test_empty_result_has_no_pages() -> None:
    page: Page[str] = Page.build(items=[], total=0, request=PageRequest())

    assert (page.total_pages, page.has_next, page.has_previous) == (0, False, False)
