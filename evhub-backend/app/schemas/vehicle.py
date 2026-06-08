from pydantic import BaseModel, Field


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100)
    logo: str | None = Field(None, max_length=500)
    country: str | None = Field(None, max_length=50)
    founded_year: int | None = None
    website: str | None = Field(None, max_length=200)
    description: str | None = None
    is_featured: bool = False
    sort_order: int = 0


class BrandUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, min_length=1, max_length=100)
    logo: str | None = Field(None, max_length=500)
    country: str | None = Field(None, max_length=50)
    founded_year: int | None = None
    website: str | None = Field(None, max_length=200)
    description: str | None = None
    is_featured: bool | None = None
    sort_order: int | None = None


class SeriesCreate(BaseModel):
    brand_id: str
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100)
    cover_image: str | None = None
    description: str | None = None
    sort_order: int = 0


class SeriesUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, min_length=1, max_length=100)
    cover_image: str | None = None
    description: str | None = None
    sort_order: int | None = None


class SkuCreate(BaseModel):
    series_id: str
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200)
    year: int | None = None
    cover_image: str | None = None
    price_min: float | None = None
    price_max: float | None = None
    battery_type: str | None = None
    range_km: int | None = None
    motor_power_w: int | None = None
    top_speed_kmh: int | None = None
    weight_kg: float | None = None
    requires_license: bool = False
    colors: list | None = None
    tags: list | None = None
    is_featured: bool = False


class SkuUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=100)
    year: int | None = None
    cover_image: str | None = None
    price_min: float | None = None
    price_max: float | None = None
    battery_type: str | None = None
    range_km: int | None = None
    motor_power_w: int | None = None
    top_speed_kmh: int | None = None
    weight_kg: float | None = None
    requires_license: bool | None = None
    colors: list | None = None
    tags: list | None = None
    is_featured: bool | None = None


class AttributeGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=100)
    sort_order: int = 0


class AttributeGroupUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    code: str | None = Field(None, min_length=1, max_length=100)
    sort_order: int | None = None


class AttributeDefinitionCreate(BaseModel):
    group_id: str
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=100)
    value_type: str = "text"
    unit: str | None = None
    is_key_spec: bool = False
    is_filterable: bool = False
    is_comparable: bool = False
    display_format: str | None = None
    sort_order: int = 0


class AttributeDefinitionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    code: str | None = Field(None, min_length=1, max_length=100)
    value_type: str | None = None
    unit: str | None = None
    is_key_spec: bool | None = None
    is_filterable: bool | None = None
    is_comparable: bool | None = None
    display_format: str | None = None
    sort_order: int | None = None


class AttributeValueItem(BaseModel):
    value_text: str | None = None
    value_number: float | None = None
    value_boolean: bool | None = None


class SkuAttributeValuesUpdate(BaseModel):
    values: dict[str, AttributeValueItem]


class SkuSearchParams(BaseModel):
    brand_slug: str | None = None
    battery_type: str | None = None
    price_min: float | None = None
    price_max: float | None = None
    range_min: int | None = None
    requires_license: bool | None = None
    tags: str | None = None
    sort_by: str = "created_at"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)