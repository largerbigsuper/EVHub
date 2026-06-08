from fastapi import APIRouter

from app.api.v1 import auth, admin_users, admin_roles, brands, vehicles, admin_vehicles

router = APIRouter()

router.include_router(auth.router)
router.include_router(admin_users.router)
router.include_router(admin_roles.router)
router.include_router(brands.router)
router.include_router(vehicles.router)
router.include_router(admin_vehicles.router)