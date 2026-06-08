import httpx
import asyncio


async def test_register():
    async with httpx.AsyncClient() as c:
        r = await c.post(
            "http://localhost:8000/api/v1/auth/register",
            json={"username": "test", "email": "test@test.com", "password": "password123"},
        )
        print(f"REGISTER: {r.status_code} {r.text}")


async def test_login():
    async with httpx.AsyncClient() as c:
        r = await c.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"login": "test@test.com", "password": "password123"},
        )
        print(f"LOGIN: {r.status_code} {r.text}")


async def test_me():
    async with httpx.AsyncClient() as c:
        r = await c.get("http://localhost:8000/api/v1/auth/me")
        print(f"ME (no auth): {r.status_code} {r.text}")


async def main():
    await test_register()
    await test_login()
    await test_me()


asyncio.run(main())