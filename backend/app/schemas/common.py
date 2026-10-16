"""Response contracts shared by every resource."""

from pydantic import BaseModel, Field

from app.core.pagination import PageRequest, total_pages


class Page[ItemT](BaseModel):
    """Envelope for every list endpoint.

    Note what is absent: offset. Clients navigate by page/has_next, which leaves
    room to switch to keyset pagination without breaking them.
    """

    items: list[ItemT]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool

    @classmethod
    def build(cls, items: list[ItemT], total: int, request: PageRequest) -> "Page[ItemT]":
        pages = total_pages(total, request.page_size)
        return cls(
            items=items,
            total=total,
            page=request.page,
            page_size=request.page_size,
            total_pages=pages,
            has_next=request.page < pages,
            has_previous=request.page > 1,
        )


class ProblemDetail(BaseModel):
    """RFC 9457 error body. Declared so it appears in the OpenAPI schema."""

    type: str = Field(examples=["/errors/not-found"])
    title: str = Field(examples=["Patient not found"])
    status: int = Field(examples=[404])
    detail: str
    instance: str | None = None
    request_id: str | None = None
