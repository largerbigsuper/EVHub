from fastapi import APIRouter

from app.api.v1 import auth, admin_users, admin_roles, brands, vehicles, admin_vehicles
from app.api.v1 import articles, admin_articles
from app.api.v1 import mod, admin_mod
from app.api.v1 import community
from app.api.v1 import search
from app.api.v1 import seo
from app.api.v1 import dashboard

router = APIRouter()

router.include_router(auth.router)
router.include_router(admin_users.router)
router.include_router(admin_roles.router)
router.include_router(brands.router)
router.include_router(vehicles.router)
router.include_router(admin_vehicles.router)
router.include_router(articles.router)
router.include_router(admin_articles.router)
router.include_router(mod.router)
router.include_router(admin_mod.router)
router.include_router(community.router)
router.include_router(search.router)
router.include_router(seo.router)
router.include_router(dashboard.router)