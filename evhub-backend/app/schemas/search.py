from pydantic import BaseModel

from app.core.response import BaseResponse


class SearchResultItemSchema(BaseModel):
    id: str
    title: str
    excerpt: str | None = None
    url: str = ""
    type: str = ""
    extra: dict | None = None


class SearchResultSchema(BaseModel):
    articles: list[SearchResultItemSchema] = []
    vehicles: list[SearchResultItemSchema] = []
    brands: list[SearchResultItemSchema] = []
    total: int = 0


class SuggestResultSchema(BaseModel):
    suggestions: list[str] = []


class HotKeywordItem(BaseModel):
    keyword: str
    search_count: int


class HotKeywordsResultSchema(BaseModel):
    keywords: list[HotKeywordItem] = []


SearchResultResp = BaseResponse[SearchResultSchema]
SuggestResultResp = BaseResponse[SuggestResultSchema]
HotKeywordsResultResp = BaseResponse[HotKeywordsResultSchema]