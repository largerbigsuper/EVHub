"""
测试数据生成与清除脚本

用法:
    python scripts/seed.py                     # 生成测试数据（默认数量）
    python scripts/seed.py --count 100         # 每个模块生成约100条
    python scripts/seed.py --clear             # 清除所有数据
    python scripts/seed.py --clear --count 50  # 先清除再生成
"""
import asyncio
import argparse
import random
import sys
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, ".")

import bcrypt
from sqlalchemy import text

from app.core.database import AsyncSessionLocal, engine, init_db
from app.models.base import Base
from app.models.user import User, Role, Permission, UserRole, RolePermission
from app.models.brand import Brand
from app.models.vehicle_series import VehicleSeries
from app.models.vehicle_sku import VehicleSku
from app.models.attribute import AttributeGroup, AttributeDefinition, VehicleAttributeValue
from app.models.article import Category, Article
from app.models.mod_build import ModBuild, ModPart
from app.models.community import Topic, Comment, Like, Favorite, Notification
from app.models.search import SearchKeyword
from app.models.audit_log import AuditLog

# ──────────────────────────────────────────────
# 常量数据
# ──────────────────────────────────────────────

BRAND_NAMES = [
    {"name": "九号", "country": "中国", "year": 2012, "website": "https://www.ninebot.com"},
    {"name": "小牛", "country": "中国", "year": 2014, "website": "https://www.niu.com"},
    {"name": "雅迪", "country": "中国", "year": 2001, "website": "https://www.yadea.com.cn"},
    {"name": "爱玛", "country": "中国", "year": 1999, "website": "https://www.aimatech.com"},
    {"name": "台铃", "country": "中国", "year": 2003, "website": "https://www.tailg.com.cn"},
    {"name": "绿源", "country": "中国", "year": 1997, "website": "https://www.luyuan.cn"},
    {"name": "新日", "country": "中国", "year": 1999, "website": "https://www.xinri.com"},
    {"name": "小刀", "country": "中国", "year": 2004, "website": "https://www.xdebike.com"},
    {"name": "立马", "country": "中国", "year": 2003, "website": "https://www.limabike.com"},
    {"name": "金箭", "country": "中国", "year": 2005, "website": "https://www.jinjian.com"},
    {"name": "五星钻豹", "country": "中国", "year": 2006, "website": ""},
    {"name": "绿佳", "country": "中国", "year": 1999, "website": ""},
    {"name": "Gogoro", "country": "中国台湾", "year": 2011, "website": "https://www.gogoro.com"},
    {"name": "Ather", "country": "印度", "year": 2013, "website": "https://www.atherenergy.com"},
    {"name": "Zero", "country": "美国", "year": 2006, "website": "https://www.zeromotorcycles.com"},
]

SERIES_NAMES = [
    "A系列", "B系列", "C系列", "E系列", "F系列", "G系列",
    "N系列", "M系列", "P系列", "S系列", "Q系列", "D系列",
    "运动版", "都市版", "旗舰版", "Pro系列", "Plus系列",
]

SKU_VARIANTS = [
    "标准版", "高配版", "顶配版", "青春版", "运动版",
    "长续航版", "都市版", "旗舰版", "智能版", "限量版",
]

COLORS = [
    ["珍珠白", "哑光黑", "极光蓝"],
    ["烈焰红", "钛金灰", "星耀银"],
    ["薄荷绿", "珊瑚橙", "星空紫"],
    ["曜石黑", "冰晶白", "极夜蓝"],
    ["磨砂灰", "糖果粉", "翡翠绿"],
]

ARTICLE_TITLES = [
    "2025年最值得买的电动车推荐",
    "电动车电池保养指南：延长寿命的5个技巧",
    "新国标解读：2025年电动车政策变化",
    "冬季骑行安全须知",
    "电动车充电桩使用全攻略",
    "如何选择适合自己的电动车",
    "电动摩托车vs电动自行车：区别在哪",
    "电动车改装入门：合法改装清单",
    "锂电池vs铅酸电池：优缺点对比",
    "雨天骑行注意事项",
    "电动车保险购买指南",
    "二手电动车选购避坑攻略",
    "电动车续航测试：实际vs标称差距有多大",
    "2025年电动车品牌排行TOP10",
    "电动车上牌流程全解析",
    "如何提升电动车续航里程",
    "电动车常见故障排查与维修",
    "智能电动车功能对比：九号vs小牛",
    "电动车轮胎选购指南",
    "城市通勤电动车推荐",
    "电动车防盗措施大全",
    "电动车头盔选购指南",
    "女性友好的电动车型推荐",
    "电动车以旧换新攻略",
    "外卖骑手电动车选购建议",
    "电动车改装避坑：哪些改装不合法",
    "磷酸铁锂电池的优势与劣势",
    "电动车充电安全须知",
    "2025年电动车行业趋势分析",
    "电动车保养周期表：多久该做什么",
]

TOPIC_TITLES = [
    "你们觉得九号和小牛哪个好？",
    "晒晒我刚改的F90，大佬们给点建议",
    "电动车冬天续航严重下降怎么办",
    "求助：我的车充不进电了",
    "今天在二环被交警拦了，说是超标车",
    "刚入手了一辆雅迪，来说说感受",
    "有没有成都的摩友一起组队骑行？",
    "电池鼓包了还能继续用吗？",
    "自己动手换控制器，分享一下过程",
    "评测：用了半年的Gogoro是什么体验？",
    "电动车通勤真的比地铁便宜吗？",
    "后轮电机异响，有没有遇到过？",
    "推荐几款适合送外卖的电动车",
    "充电的时候闻到焦味怎么办",
    "北京到天津的电动摩托骑行记录",
    "分享一下我的防盗改装方案",
    "在线求推荐一个靠谱的修理店",
    "电池安全很重要，大家注意",
    "有没有人试过把电动车带出国？",
    "今天看到一个小姐姐骑的车好漂亮",
    "电动车改装一定要合法合规",
    "车灯太暗了，想换LED大灯",
    "2026年电动车新政策讨论",
    "头盔一定要买好点的，安全第一",
    "你们的保险费一年多少钱？",
    "社区新人报到，请多关照",
    "电动车百公里电费到底多少钱",
    "有没有用手机APP远程启动的功能？",
    "前轮刹车异响排查与解决",
    "分享一下我的长途骑行装备清单",
]

CATEGORIES = [
    {"name": "购车指南", "slug": "buying-guide", "description": "选购电动车的全面指导", "children": [
        {"name": "新手入门", "slug": "newbie", "description": "刚接触电动车必看"},
        {"name": "车型对比", "slug": "comparison", "description": "不同车型横向对比"},
    ]},
    {"name": "评测体验", "slug": "reviews", "description": "真实车主的评测分享", "children": [
        {"name": "深度评测", "slug": "in-depth", "description": "详细的长测报告"},
    ]},
    {"name": "维修保养", "slug": "maintenance", "description": "电动车日常维护修理"},
    {"name": "行业资讯", "slug": "news", "description": "电动车行业最新动态", "children": [
        {"name": "政策法规", "slug": "policy", "description": "最新政策解读"},
    ]},
    {"name": "改装日记", "slug": "modding", "description": "电动车改装方案分享"},
    {"name": "骑行生活", "slug": "lifestyle", "description": "骑行故事与生活方式"},
]

PASSWORD_HASH = bcrypt.hashpw("Test123456".encode(), bcrypt.gensalt()).decode()

DIFFICULTIES = ["easy", "medium", "hard"]

NOTIFY_TYPES = ["comment_reply", "like", "follow", "system"]

# 可访问的真实占位图（通过 picsum.photos 获取随机图片，每次同一seed拿同一张）
_COVER_SEEDS = [
    "https://picsum.photos/seed/ev-scooter-1/800/450",
    "https://picsum.photos/seed/ev-battery-2/800/450",
    "https://picsum.photos/seed/ev-ride-3/800/450",
    "https://picsum.photos/seed/ev-city-4/800/450",
    "https://picsum.photos/seed/ev-charge-5/800/450",
    "https://picsum.photos/seed/ev-motor-6/800/450",
    "https://picsum.photos/seed/ev-helmet-7/800/450",
    "https://picsum.photos/seed/ev-road-8/800/450",
    "https://picsum.photos/seed/ev-park-9/800/450",
    "https://picsum.photos/seed/ev-show-10/800/450",
    "https://picsum.photos/seed/ev-mod-11/800/450",
    "https://picsum.photos/seed/ev-traffic-12/800/450",
    "https://picsum.photos/seed/ev-shop-13/800/450",
    "https://picsum.photos/seed/ev-sunset-14/800/450",
    "https://picsum.photos/seed/ev-night-15/800/450",
]

_LOGO_SEEDS = [
    "https://picsum.photos/seed/logo-ninebot/200/200",
    "https://picsum.photos/seed/logo-niu/200/200",
    "https://picsum.photos/seed/logo-yadea/200/200",
    "https://picsum.photos/seed/logo-aima/200/200",
    "https://picsum.photos/seed/logo-tailg/200/200",
    "https://picsum.photos/seed/logo-luyuan/200/200",
    "https://picsum.photos/seed/logo-xinri/200/200",
    "https://picsum.photos/seed/logo-xiaodao/200/200",
    "https://picsum.photos/seed/logo-lima/200/200",
    "https://picsum.photos/seed/logo-jinjian/200/200",
    "https://picsum.photos/seed/logo-zuanbao/200/200",
    "https://picsum.photos/seed/logo-lvjia/200/200",
    "https://picsum.photos/seed/logo-gogoro/200/200",
    "https://picsum.photos/seed/logo-ather/200/200",
    "https://picsum.photos/seed/logo-zero/200/200",
]

_AVATAR_SEEDS = [
    "https://picsum.photos/seed/user-av-1/100/100",
    "https://picsum.photos/seed/user-av-2/100/100",
    "https://picsum.photos/seed/user-av-3/100/100",
    "https://picsum.photos/seed/user-av-4/100/100",
    "https://picsum.photos/seed/user-av-5/100/100",
    "https://picsum.photos/seed/user-av-6/100/100",
    "https://picsum.photos/seed/user-av-7/100/100",
    "https://picsum.photos/seed/user-av-8/100/100",
]

_MOD_COVERS = [
    "https://picsum.photos/seed/mod-bike-1/800/450",
    "https://picsum.photos/seed/mod-parts-2/800/450",
    "https://picsum.photos/seed/mod-light-3/800/450",
    "https://picsum.photos/seed/mod-wheel-4/800/450",
    "https://picsum.photos/seed/mod-seat-5/800/450",
]


def _random_cover() -> str:
    return random.choice(_COVER_SEEDS)


def _random_logo() -> str | None:
    return random.choice(_LOGO_SEEDS) if random.random() < 0.8 else None


def _random_avatar() -> str | None:
    return random.choice(_AVATAR_SEEDS) if random.random() < 0.6 else None


# ──────────────────────────────────────────────
# 辅助函数
# ──────────────────────────────────────────────

def _slug(text: str) -> str:
    return text.lower().replace(" ", "-").replace("：", "-").replace("，", "-")[:50]


def _random_date(days_back: int = 365) -> datetime:
    now = datetime.utcnow()
    return now - timedelta(days=random.randint(0, days_back), hours=random.randint(0, 23))


def _markdown_content(title: str) -> str:
    return f"""## {title}

欢迎阅读本文。本文将为您详细介绍相关内容。

### 一、背景介绍

随着两轮电动车市场的快速发展，越来越多的消费者开始关注电动车的选购、使用和维护。

### 二、详细分析

{random.choice(["电动车作为绿色出行方式，具有环保、经济的优势。", "目前市场上的电动车品牌众多，价格从几千元到几万元不等。", "选择适合自己的电动车，需要综合考虑续航、动力、价格等因素。"])}

### 三、实用建议

1. 购买前一定要试驾
2. 关注电池质保政策
3. 了解当地上牌要求
4. 选择合适的保险方案

> 本文仅供参考，具体请以官方信息为准。

---
*最后更新于 {datetime.utcnow().strftime("%Y-%m-%d")}*
"""


# ──────────────────────────────────────────────
# 数据生成
# ──────────────────────────────────────────────

async def seed_users(db, count: int) -> list[User]:
    print(f"  生成用户: {count} 条...", end=" ")
    users = []

    # admin 账号
    admin = User(
        username="admin",
        nickname="系统管理员",
        email="admin@evhub.cn",
        password_hash=PASSWORD_HASH,
        status=1,
    )
    db.add(admin)
    users.append(admin)

    # editor
    editor = User(
        username="editor",
        nickname="内容编辑",
        email="editor@evhub.cn",
        password_hash=PASSWORD_HASH,
        status=1,
    )
    db.add(editor)
    users.append(editor)

    # normal users
    for i in range(count - 2):
        user = User(
            username=f"testuser{i+1:03d}",
            nickname=random.choice(["骑手", "车友", "电动侠", "追风少年", "环保达人", "城市骑士",
                                     "摩旅者", "改车狂魔", "配件党", "技术控"]) + str(i),
            email=f"user{i+1:03d}@evhub.cn",
            password_hash=PASSWORD_HASH,
            avatar=_random_avatar(),
            status=1,
            last_login_at=_random_date(30),
        )
        db.add(user)
        users.append(user)

    await db.flush()

    # 角色
    admin_role = Role(name="管理员", code="admin", description="系统管理员，拥有所有权限")
    editor_role = Role(name="编辑", code="editor", description="内容编辑，可管理文章和改装方案")
    user_role = Role(name="普通用户", code="user", description="普通注册用户")
    db.add_all([admin_role, editor_role, user_role])
    await db.flush()

    # 权限
    perm_codes = [
        "article:create", "article:update", "article:delete", "article:publish",
        "mod:create", "mod:update", "mod:delete", "mod:publish",
        "user:list", "user:update", "user:delete",
        "brand:create", "brand:update", "brand:delete",
        "vehicle:create", "vehicle:update", "vehicle:delete",
        "dashboard:view", "audit:view",
    ]
    permissions = []
    for code in perm_codes:
        name_map = {
            "article:create": "创建文章", "article:update": "编辑文章", "article:delete": "删除文章",
            "article:publish": "发布文章", "mod:create": "创建方案", "mod:update": "编辑方案",
            "mod:delete": "删除方案", "mod:publish": "发布方案", "user:list": "查看用户",
            "user:update": "编辑用户", "user:delete": "删除用户", "brand:create": "创建品牌",
            "brand:update": "编辑品牌", "brand:delete": "删除品牌", "vehicle:create": "创建车型",
            "vehicle:update": "编辑车型", "vehicle:delete": "删除车型",
            "dashboard:view": "查看仪表盘", "audit:view": "查看审计日志",
        }
        permissions.append(Permission(name=name_map[code], code=code))
    db.add_all(permissions)
    await db.flush()

    # 用户角色关联
    db.add(UserRole(user_id=admin.id, role_id=admin_role.id))
    db.add(UserRole(user_id=editor.id, role_id=editor_role.id))
    for u in users[2:]:
        db.add(UserRole(user_id=u.id, role_id=user_role.id))
    await db.flush()

    # 角色权限关联 (admin 所有权限, editor 内容权限)
    for p in permissions:
        db.add(RolePermission(role_id=admin_role.id, permission_id=p.id))
    editor_perm_codes = {"article:create", "article:update", "article:delete", "article:publish",
                         "mod:create", "mod:update", "mod:delete", "mod:publish"}
    for p in permissions:
        if p.code in editor_perm_codes:
            db.add(RolePermission(role_id=editor_role.id, permission_id=p.id))
    await db.flush()

    print("OK")
    return users


async def seed_brands(db, count: int) -> list[Brand]:
    print(f"  生成品牌: {min(count, len(BRAND_NAMES))} 条...", end=" ")
    brands = []
    for i, b in enumerate(BRAND_NAMES[:count]):
        brand = Brand(
            name=b["name"],
            slug=f"brand-{b['name'].lower().replace(' ', '-')}",
            logo=_random_logo(),
            country=b["country"],
            founded_year=b["year"],
            website=b["website"] or None,
            description=f"{b['name']}是一家知名的电动车品牌，成立于{b['year']}年，总部位于{b['country']}。"
                        f"多年来专注于电动车研发与制造，拥有多项核心技术专利，产品覆盖城市通勤、运动骑行等多个细分市场。",
            is_featured=i < 6,
            sort_order=i * 10,
        )
        db.add(brand)
        brands.append(brand)
    await db.flush()
    print("OK")
    return brands


async def seed_series(db, brands: list[Brand], per_brand: int) -> list[VehicleSeries]:
    print(f"  生成车系: {len(brands) * per_brand} 条...", end=" ")
    series_list = []
    used_names: set[str] = set()
    for brand in brands:
        for i in range(per_brand):
            name = random.choice(SERIES_NAMES)
            key = f"{brand.name}-{name}"
            while key in used_names:
                name = random.choice(SERIES_NAMES)
                key = f"{brand.name}-{name}"
            used_names.add(key)

            series = VehicleSeries(
                brand_id=brand.id,
                name=f"{brand.name} {name}",
                slug=f"{brand.slug}-{name.lower().replace(' ', '-')}",
                cover_image=_random_cover(),
                description=f"{brand.name} {name}是{brand.name}品牌旗下的重要产品线，"
                            f"定位于{random.choice(['城市通勤', '运动骑行', '休闲代步', '高端旗舰'])}市场，"
                            f"以{random.choice(['续航持久', '动力强劲', '智能互联', '时尚外观', '舒适驾乘'])}为卖点。",
                sort_order=i,
            )
            db.add(series)
            series_list.append(series)
    await db.flush()
    print("OK")
    return series_list


async def seed_skus(db, series_list: list[VehicleSeries], per_series: int) -> list[VehicleSku]:
    print(f"  生成SKU: {len(series_list) * per_series} 条...", end=" ")
    skus = []
    battery_types = ["铅酸", "锂电", "磷酸铁锂", "三元锂"]
    for series in series_list:
        for i in range(per_series):
            price = random.randint(1500, 12000)
            sku = VehicleSku(
                series_id=series.id,
                name=f"{series.name} {random.choice(SKU_VARIANTS)}",
                slug=f"{series.slug}-{random.choice(SKU_VARIANTS).lower()}-{i}",
                year=random.choice([2023, 2024, 2025, 2026]),
                cover_image=_random_cover(),
                price_min=price - random.randint(200, 500),
                price_max=price + random.randint(200, 500),
                battery_type=random.choice(battery_types),
                range_km=random.choice([40, 50, 60, 70, 80, 90, 100, 120, 150, 200]),
                motor_power_w=random.choice([350, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000]),
                top_speed_kmh=random.choice([25, 35, 45, 50, 55, 60, 70, 80, 100]),
                weight_kg=round(random.uniform(40, 120), 1),
                requires_license=random.choice([True, False]),
                colors=random.choice(COLORS),
                tags=random.choice([
                    ["长续航", "性价比"], ["运动", "智能"], ["通勤", "轻便"],
                    ["高端", "旗舰"], ["入门", "实惠"], ["性能", "竞速"],
                ]),
                is_featured=random.random() < 0.2,
            )
            db.add(sku)
            skus.append(sku)
    await db.flush()
    print("OK")
    return skus


async def seed_attributes(db, skus: list[VehicleSku]):
    print("  生成属性分组与定义...", end=" ")
    groups_data = [
        ("动力参数", "powertrain", [
            ("电机功率", "motor_power", "number", "W", True, True, True),
            ("峰值扭矩", "peak_torque", "number", "Nm", False, False, True),
            ("最高时速", "top_speed", "number", "km/h", True, True, True),
            ("0-50km加速", "acceleration", "number", "s", False, False, True),
        ]),
        ("电池参数", "battery", [
            ("电池类型", "battery_type_text", "text", None, True, True, False),
            ("电池容量", "battery_capacity", "number", "Ah", True, True, True),
            ("充电时间", "charge_time", "number", "h", False, True, False),
            ("可拆卸电池", "removable_battery", "boolean", None, False, False, False),
            ("电池重量", "battery_weight", "number", "kg", False, False, False),
        ]),
        ("车身参数", "body", [
            ("整车重量", "vehicle_weight", "number", "kg", True, True, True),
            ("轮胎规格", "tire_spec", "text", None, False, True, False),
            ("制动方式", "brake_type", "text", None, True, False, True),
            ("减震类型", "suspension_type", "text", None, False, False, False),
            ("轴距", "wheelbase", "number", "mm", False, False, True),
            ("座高", "seat_height", "number", "mm", False, False, False),
        ]),
        ("智能配置", "smart", [
            ("智能解锁", "smart_unlock", "boolean", None, False, True, False),
            ("GPS定位", "gps", "boolean", None, False, True, False),
            ("手机互联", "app_connect", "boolean", None, False, True, False),
            ("OTA升级", "ota", "boolean", None, False, False, False),
        ]),
        ("灯光配置", "lights", [
            ("大灯类型", "headlight_type", "text", None, False, False, False),
            ("转向灯", "turn_signal", "boolean", None, False, False, False),
            ("日行灯", "dtrl", "boolean", None, False, False, False),
        ]),
    ]

    groups = []
    for group_name, group_code, defs in groups_data:
        g = AttributeGroup(name=group_name, code=group_code, sort_order=len(groups) * 10)
        db.add(g)
        await db.flush()
        groups.append(g)

        for j, (def_name, def_code, val_type, unit, key_spec, filterable, comparable) in enumerate(defs):
            d = AttributeDefinition(
                group_id=g.id,
                name=def_name,
                code=def_code,
                value_type=val_type,
                unit=unit,
                is_key_spec=key_spec,
                is_filterable=filterable,
                is_comparable=comparable,
                sort_order=j * 10,
            )
            db.add(d)
            await db.flush()

            # 为每个SKU生成属性值
            for sku in skus:
                if val_type == "number":
                    if def_code == "motor_power":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=sku.motor_power_w)
                    elif def_code == "top_speed":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=sku.top_speed_kmh)
                    elif def_code == "vehicle_weight":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=sku.weight_kg)
                    elif def_code == "battery_capacity":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=float(random.choice([12, 20, 24, 30, 40, 48, 60])))
                    elif def_code == "battery_weight":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=round(random.uniform(3, 15), 1))
                    elif def_code == "charge_time":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=round(random.uniform(3, 10), 1))
                    elif def_code == "acceleration":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=round(random.uniform(3.0, 8.0), 1))
                    elif def_code == "peak_torque":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=float(random.choice([50, 80, 100, 120, 150, 180])))
                    elif def_code == "wheelbase":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=float(random.choice([1200, 1250, 1300, 1350, 1400])))
                    elif def_code == "seat_height":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=float(random.choice([720, 750, 780, 800])))
                    else:
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_number=float(random.randint(1, 1000)))
                elif val_type == "boolean":
                    v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_boolean=random.choice([True, False]))
                elif val_type == "text":
                    if def_code == "battery_type_text":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_text=sku.battery_type)
                    elif def_code == "brake_type":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_text=random.choice(["碟刹", "鼓刹", "前后碟刹"]))
                    elif def_code == "tire_spec":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_text=random.choice(["3.00-10", "90/90-12", "100/80-12", "120/70-12"]))
                    elif def_code == "suspension_type":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_text=random.choice(["液压前叉", "倒置前叉", "中置减震", "双枪后减震"]))
                    elif def_code == "headlight_type":
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_text=random.choice(["LED", "卤素", "激光LED"]))
                    else:
                        v = VehicleAttributeValue(sku_id=sku.id, attribute_id=d.id, value_text="--")
                db.add(v)
            await db.flush()

    print("OK")


async def seed_categories(db) -> list[Category]:
    print("  生成文章分类...", end=" ")
    categories: list[Category] = []
    for i, cat_data in enumerate(CATEGORIES):
        cat = Category(
            name=cat_data["name"],
            slug=cat_data["slug"],
            description=cat_data.get("description"),
            sort_order=i * 10,
        )
        db.add(cat)
        categories.append(cat)
    await db.flush()

    for cat_data, cat in zip(CATEGORIES, categories):
        if "children" in cat_data:
            for j, child_data in enumerate(cat_data["children"]):
                child = Category(
                    name=child_data["name"],
                    slug=child_data["slug"],
                    parent_id=cat.id,
                    description=child_data.get("description"),
                    sort_order=j * 10,
                )
                db.add(child)
                categories.append(child)
    await db.flush()
    print(f"{len(categories)} 条 OK")
    return categories


async def seed_articles(db, users: list[User], categories: list[Category], count: int):
    print(f"  生成文章: {count} 条...", end=" ")
    for i in range(count):
        title = ARTICLE_TITLES[i % len(ARTICLE_TITLES)] + (f" (第{i//len(ARTICLE_TITLES)+1}期)" if i >= len(ARTICLE_TITLES) else "")
        slug = _slug(title) + f"-{i}"
        status = random.choice(["published", "published", "published", "published", "draft"])
        article = Article(
            title=title,
            slug=slug,
            content=_markdown_content(title),
            excerpt=f"本文为您详细介绍{title[:30]}的相关内容，包括选购建议、使用技巧和注意事项。",
            cover_image=_random_cover(),
            category_id=random.choice(categories).id if categories else None,
            author_id=random.choice(users).id,
            status=status,
            view_count=random.randint(50, 50000),
            is_featured=random.random() < 0.15,
            tags=random.choice([
                ["电动车", "选购"], ["电池", "保养"], ["评测", "体验"],
                ["政策", "法规"], ["改装", "DIY"], ["安全", "须知"],
                ["通勤", "生活"], ["品牌", "对比"],
            ]),
            published_at=_random_date(365) if status == "published" else None,
        )
        db.add(article)
    await db.flush()
    print("OK")


async def seed_mod_builds(db, users: list[User], skus: list[VehicleSku], count: int):
    print(f"  生成改装方案: {count} 条...", end=" ")
    for i in range(count):
        status = random.choice(["published", "published", "published", "draft"])
        sku = random.choice(skus) if skus else None
        build = ModBuild(
            title=f"改装方案：{random.choice(['大灯升级', '电池扩容', '舒适减震', '性能调校', '外观美化', '智能改造'])} #{i+1}",
            slug=f"mod-build-{i+1}",
            description=f"本方案分享{random.choice(['大灯升级', '电池扩容', '舒适减震', '性能调校'])}的完整改装过程和心得。",
            content=f"""## 改装背景

一直想对我的车辆进行一些升级改造，经过研究决定从以下几个方面入手。

## 改装清单

| 配件 | 品牌 | 价格 |
|------|------|------|
| LED大灯 | {random.choice(['欧司朗', '飞利浦', '海拉'])} | ¥{random.randint(50, 300)} |
| 控制器 | {random.choice(['远驱', '兰德酷路泽', 'APT'])} | ¥{random.randint(200, 800)} |
| 减震器 | {random.choice(['RST', 'ACE', 'SHOWA'])} | ¥{random.randint(100, 500)} |

## 改装过程

1. 先拆下原装部件
2. 对比新旧配件尺寸
3. 按照说明书安装
4. 测试功能是否正常

> ⚠️ 改装请遵守当地法规，非法改装可能面临处罚。
""",
            vehicle_sku_id=sku.id if sku else None,
            author_id=random.choice(users).id,
            total_cost=round(random.uniform(200, 5000), 2),
            difficulty=random.choice(DIFFICULTIES),
            is_legal=random.random() < 0.75,
            legal_note="本方案所有改装均符合当地法规要求。",
            status=status,
            cover_image=random.choice(_MOD_COVERS),
            tags=random.choice([
                ["外观", "灯光"], ["性能", "动力"], ["舒适", "减震"],
                ["安全", "制动"], ["智能", "联网"], ["电池", "续航"],
            ]),
            view_count=random.randint(100, 30000),
            published_at=_random_date(180) if status == "published" else None,
        )
        db.add(build)
        await db.flush()

        # 配件
        part_count = random.randint(3, 6)
        for j in range(part_count):
            part = ModPart(
                build_id=build.id,
                name=random.choice(["LED大灯总成", "控制器升级版", "液压减震器", "锂电池组",
                                    "碟刹套件", "轮胎升级", "车把改装", "后视镜", "座垫升级"]),
                brand=random.choice(["欧司朗", "飞利浦", "远驱", "ACE", "RST", "博世", "NGK", None]),
                price=round(random.uniform(30, 800), 2),
                purchase_url=f"https://shop.example.com/part/{i}-{j}" if random.random() < 0.5 else None,
                is_legal=random.random() < 0.8,
                quantity=random.randint(1, 3),
                notes=random.choice(["注意安装方向", "需要专业工具", None, "建议到店安装", None]),
            )
            db.add(part)
    await db.flush()
    print("OK")


async def seed_topics(db, users: list[User], count: int):
    print(f"  生成帖子: {count} 条...", end=" ")
    for i in range(count):
        title = TOPIC_TITLES[i % len(TOPIC_TITLES)] + (f" (续)" if i >= len(TOPIC_TITLES) else "")
        topic = Topic(
            title=title,
            content=f"**{title}**\n\n{random.choice(['大家来讨论一下', '有没有懂的', '在线等回答', '分享一下个人经验'])}\n\n"
                    f"{random.choice(['欢迎评论区交流', '有同样情况的吗？', '求大佬指教！', '先谢谢各位了'])}",
            author_id=random.choice(users).id,
            tags=random.choice([
                ["求助"], ["讨论"], ["分享"], ["经验", "求助"], ["改装", "分享"],
                ["日常"], ["晒车", "评测"],
            ]),
            view_count=random.randint(10, 10000),
            reply_count=random.randint(0, 50),
            like_count=random.randint(0, 200),
            is_pinned=random.random() < 0.05,
            is_highlighted=random.random() < 0.1,
            last_reply_at=_random_date(30),
            status="published",
        )
        db.add(topic)
    await db.flush()
    print("OK")


async def seed_comments(db, users: list[User], articles: list, topics: list, mod_builds: list, count: int):
    print(f"  生成评论: {count} 条...", end=" ")
    targets = [
        *[("article", a) for a in articles],
        *[("topic", t) for t in topics],
        *[("mod_build", m) for m in mod_builds],
    ]
    if not targets:
        print("跳过 (无目标)")
        return

    comment_texts = [
        "写得很好，学习了！", "感谢分享，很有帮助", "这个价格有点贵啊",
        "请问一下具体怎么操作？", "用了一段时间了，确实不错", "有没有更便宜的替代方案？",
        "支持一下，继续更新！", "之前也遇到过类似问题", "收藏了，以后用得上",
        "楼主辛苦了", "这个改装合法吗？", "在哪里买的？给个链接",
        "实测续航和标称差多少？", "这个颜色好看！", "需要驾照吗这款？",
        "冬天续航确实下降很多", "推荐换锂电，续航能提升不少", "路上看到过这款，很帅",
        "已入手同款，香", "有没有群？求拉",
    ]

    for i in range(count):
        target_type, target = random.choice(targets)
        comment = Comment(
            target_type=target_type,
            target_id=target.id,
            user_id=random.choice(users).id,
            content=random.choice(comment_texts),
            floor=i % 50 + 1,
        )
        db.add(comment)
    await db.flush()
    print("OK")


async def seed_likes(db, users: list[User], articles: list, topics: list, count: int):
    print(f"  生成点赞: {count} 条...", end=" ")
    targets = [
        *[("article", a) for a in articles],
        *[("topic", t) for t in topics],
    ]
    if not targets:
        print("跳过 (无目标)")
        return

    seen = set()
    for _ in range(count):
        while True:
            target_type, target = random.choice(targets)
            user = random.choice(users)
            key = (str(user.id), target_type, str(target.id))
            if key not in seen:
                seen.add(key)
                break
        like = Like(
            user_id=user.id,
            target_type=target_type,
            target_id=target.id,
        )
        db.add(like)
    await db.flush()
    print("OK")


async def seed_favorites(db, users: list[User], articles: list, topics: list, mod_builds: list, count: int):
    print(f"  生成收藏: {count} 条...", end=" ")
    targets = [
        *[("article", a) for a in articles],
        *[("topic", t) for t in topics],
        *[("mod_build", m) for m in mod_builds],
    ]
    if not targets:
        print("跳过 (无目标)")
        return

    for _ in range(count):
        target_type, target = random.choice(targets)
        fav = Favorite(
            user_id=random.choice(users).id,
            target_type=target_type,
            target_id=target.id,
        )
        db.add(fav)
    await db.flush()
    print("OK")


async def seed_notifications(db, users: list[User], count: int):
    print(f"  生成通知: {count} 条...", end=" ")
    titles = [
        "有新回复了", "有人点赞了你的帖子", "你的文章被收藏了",
        "系统通知：新功能上线", "你的帖子被设为精华", "关注的人发布了新内容",
        "你的评论收到回复", "欢迎加入EVHub社区！", "你的改装方案通过了审核",
        "社区活动通知",
    ]
    for i in range(count):
        notif = Notification(
            user_id=random.choice(users).id,
            type=random.choice(NOTIFY_TYPES),
            title=random.choice(titles),
            content=random.choice(["点击查看详情", "快去看看吧", "不要错过精彩内容", None]),
            link=f"/{random.choice(['topics', 'articles', 'mod-builds'])}/{uuid.uuid4()}",
            is_read=random.random() < 0.6,
            created_at=_random_date(60),
        )
        db.add(notif)
    await db.flush()
    print("OK")


async def seed_search_keywords(db, count: int):
    print(f"  生成搜索关键词: {count} 条...", end=" ")
    keywords = [
        "九号", "小牛", "雅迪", "爱玛", "电动车推荐", "长续航",
        "锂电池", "电动车改装", "充电桩", "电动车上牌", "二手车",
        "电动车保险", "头盔推荐", "电动车维修", "电池更换",
        "Gogoro", "电动车对比", "外卖电动车", "折叠电动车",
        "电动车政策", "新国标", "电动车驾照", "冬天续航",
        "电动车选购", "电动车评测", "智能电动车", "城市通勤",
        "学生电动车", "女士电动车", "便宜电动车", "高端电动车",
        "爬坡能力", "减震舒适", "刹车安全", "轮胎规格",
        "最高时速", "电机功率", "电池容量", "充电时间",
    ]
    for i in range(min(count, len(keywords))):
        kw = SearchKeyword(
            keyword=keywords[i],
            search_count=random.randint(10, 5000),
            last_searched_at=_random_date(30),
        )
        db.add(kw)
    await db.flush()
    print("OK")


# ──────────────────────────────────────────────
# 清除数据
# ──────────────────────────────────────────────

async def clear_all(db):
    tables = [
        "vehicle_attribute_values",
        "attribute_definitions",
        "attribute_groups",
        "mod_parts",
        "mod_builds",
        "likes",
        "favorites",
        "notifications",
        "comments",
        "topics",
        "articles",
        "categories",
        "vehicle_skus",
        "vehicle_series",
        "brands",
        "search_keywords",
        "audit_logs",
        "role_permissions",
        "user_roles",
        "permissions",
        "roles",
        "users",
    ]
    for table in tables:
        await db.execute(text(f"DELETE FROM {table}"))
    await db.commit()
    print("  所有数据已清除")


# ──────────────────────────────────────────────
# 主入口
# ──────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="EVHub 测试数据生成器")
    parser.add_argument("--count", type=int, default=30, help="每个模块的基准数据量 (默认: 30)")
    parser.add_argument("--clear", action="store_true", help="清除所有数据")
    args = parser.parse_args()

    n = args.count

    async with AsyncSessionLocal() as db:
        if args.clear:
            print("[1/2] 清除现有数据...")
            await clear_all(db)

        print(f"[{'2/2' if args.clear else '1/1'}] 生成测试数据 (基准数量: {n})...")
        print()

        users = await seed_users(db, n)
        brands = await seed_brands(db, min(n, 15))
        series_list = await seed_series(db, brands, 4)
        skus = await seed_skus(db, series_list, 3)
        await seed_attributes(db, skus)
        categories = await seed_categories(db)
        await seed_articles(db, users, categories, n)
        await seed_mod_builds(db, users, skus, n)
        await seed_topics(db, users, n)

        from sqlalchemy import select as sa_select
        article_result = await db.execute(sa_select(Article).limit(n * 3))
        articles = list(article_result.scalars().all())

        mod_build_result = await db.execute(sa_select(ModBuild).limit(n * 3))
        mod_builds = list(mod_build_result.scalars().all())

        topic_result = await db.execute(sa_select(Topic).limit(n * 3))
        topics = list(topic_result.scalars().all())

        await seed_comments(db, users, articles, topics, mod_builds, n * 3)
        await seed_likes(db, users, articles, topics, n * 4)
        await seed_favorites(db, users, articles, topics, mod_builds, n * 2)
        await seed_notifications(db, users, n * 3)
        await seed_search_keywords(db, n)

        await db.commit()
        print()
        print("=" * 50)
        print("  测试数据生成完成！")
        print()
        print("  测试账号:")
        print("    admin  / Test123456  (管理员)")
        print("    editor / Test123456  (编辑)")
        print("    testuser001 / Test123456 (普通用户)")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())