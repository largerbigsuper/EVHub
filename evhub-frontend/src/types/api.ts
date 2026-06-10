export interface BaseResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PageResponse<T = unknown> {
  code: number;
  message: string;
  data: T[];
  meta: PageMeta;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserInfo {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string | null;
  role: string;
  status: number;
}

// ---- Vehicle Types ----

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  country: string | null;
  founded_year: number | null;
  website: string | null;
  description: string | null;
  is_featured: boolean;
  sort_order: number;
  series_count: number;
}

export interface BrandDetail extends BrandItem {
  series: SeriesItem[];
}

export interface SeriesItem {
  id: string;
  brand_id: string;
  brand_name: string | null;
  name: string;
  slug: string;
  cover_image: string | null;
  description: string | null;
  sort_order: number;
  sku_count: number;
}

export interface KeySpecItem {
  name: string;
  value: string | number | boolean | null;
  unit: string | null;
}

export interface SkuSimpleItem {
  id: string;
  series_name: string | null;
  brand_name: string | null;
  name: string;
  slug: string;
  year: number | null;
  cover_image: string | null;
  price_min: number | null;
  price_max: number | null;
  battery_type: string | null;
  range_km: number | null;
  motor_power_w: number | null;
  top_speed_kmh: number | null;
  weight_kg: number | null;
  requires_license: boolean;
  tags: string[] | null;
  key_specs: KeySpecItem[];
}

export interface AttributeValueOut {
  name: string;
  code: string;
  value: string | number | boolean | null;
  unit: string | null;
}

export interface AttributeGroupOut {
  group_name: string;
  items: AttributeValueOut[];
}

export interface SkuDetailItem {
  id: string;
  series_id: string;
  series_name: string | null;
  series_slug: string | null;
  brand_id: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  name: string;
  slug: string;
  year: number | null;
  cover_image: string | null;
  price_min: number | null;
  price_max: number | null;
  battery_type: string | null;
  range_km: number | null;
  motor_power_w: number | null;
  top_speed_kmh: number | null;
  weight_kg: number | null;
  requires_license: boolean;
  colors: string[] | null;
  tags: string[] | null;
  is_featured: boolean;
  attribute_groups: AttributeGroupOut[];
}

export interface CompareAttribute {
  name: string;
  code: string;
  unit: string | null;
  values: (string | number | boolean | null)[];
}

export interface CompareResult {
  skus: SkuDetailItem[];
  attributes: CompareAttribute[];
}

export interface AttributeDefinitionItem {
  id: string;
  name: string;
  code: string;
  value_type: string;
  unit: string | null;
  is_key_spec: boolean;
  is_filterable: boolean;
  is_comparable: boolean;
  display_format: string | null;
  sort_order: number;
}

export interface AttributeGroupDetail {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  definitions: AttributeDefinitionItem[];
}

// ---- Article / Category Types ----

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  icon: string | null;
  sort_order: number;
  article_count: number;
  children: CategoryItem[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  status: string;
  is_featured: boolean;
  tags: string[] | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  author: {
    id: string;
    username: string;
    nickname: string;
    avatar: string | null;
  } | null;
  category: CategoryItem | null;
}

export interface ArticleDetail extends ArticleItem {
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  rejected_reason: string | null;
  updated_at: string | null;
}

// ---- Mod Build Types ----

export interface ModPartItem {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  purchase_url: string | null;
  is_legal: boolean;
  quantity: number;
  notes: string | null;
}

export interface ModBuildItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  is_legal: boolean;
  legal_note: string | null;
  status: string;
  difficulty: string | null;
  total_cost: number | null;
  tags: string[] | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  author: {
    id: string;
    username: string;
    nickname: string;
    avatar: string | null;
  } | null;
  vehicle_sku: {
    id: string;
    name: string;
  } | null;
}

export interface AdminModBuildItem extends ModBuildItem {
  rejected_reason: string | null;
}

export interface ModBuildDetail extends AdminModBuildItem {
  content: string;
  parts: ModPartItem[];
  vehicle_sku: {
    id: string;
    name: string;
    series_name: string | null;
    brand_name: string | null;
  } | null;
  updated_at: string | null;
}

// ---- Community Types ----

export interface TopicItem {
  id: string;
  title: string;
  content: string;
  author: AuthorInfo | null;
  tags: string[] | null;
  view_count: number;
  reply_count: number;
  like_count: number;
  is_pinned: boolean;
  is_highlighted: boolean;
  last_reply_at: string | null;
  status: string;
  created_at: string | null;
}

export interface AuthorInfo {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
}

export interface CommentReplyItem {
  id: string;
  user: AuthorInfo | null;
  content: string;
  parent_id: string | null;
  floor: number | null;
  like_count: number;
  created_at: string | null;
}

export interface CommentItem {
  id: string;
  target_type: string;
  target_id: string;
  user: AuthorInfo | null;
  content: string;
  parent_id: string | null;
  floor: number | null;
  like_count: number;
  created_at: string | null;
  replies: CommentReplyItem[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string | null;
}

// ---- Search Types ----

export interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  type: string;
  extra: Record<string, unknown> | null;
}

export interface SearchResult {
  articles: SearchResultItem[];
  vehicles: SearchResultItem[];
  brands: SearchResultItem[];
  total: number;
}

export interface HotKeyword {
  keyword: string;
  search_count: number;
}