from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from app.config import get_settings
from app.dependencies import get_current_user
from app.core.response import success_response
from app.services.storage.local import UPLOAD_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE
from app.services.storage.local import LocalStorageBackend
from app.services.storage.qiniu import QiniuStorageBackend


router = APIRouter(prefix="/upload", tags=["文件上传"])


def _get_storage_backend():

    settings = get_settings()
    if settings.UPLOAD_BACKEND == "qiniu":
        if not all([settings.QINIU_ACCESS_KEY, settings.QINIU_SECRET_KEY, settings.QINIU_BUCKET, settings.QINIU_DOMAIN]):
            raise HTTPException(
                status_code=500,
                detail="七牛云存储配置不完整，请检查 QINIU_ACCESS_KEY / QINIU_SECRET_KEY / QINIU_BUCKET / QINIU_DOMAIN",
            )
        return QiniuStorageBackend(
            access_key=settings.QINIU_ACCESS_KEY,
            secret_key=settings.QINIU_SECRET_KEY,
            bucket=settings.QINIU_BUCKET,
            domain=settings.QINIU_DOMAIN,
        )
    return LocalStorageBackend(base_url=settings.APP_URL or "http://localhost:8000")


def _validate_image(filename: str, size: int) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext}，仅支持 {', '.join(ALLOWED_EXTENSIONS)}",
        )
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件大小超过限制 ({MAX_FILE_SIZE // (1024 * 1024)}MB)",
        )


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Form("images"),
    current_user: dict = Depends(get_current_user),
):
    data = await file.read()
    _validate_image(file.filename or "unknown", len(data))

    backend = _get_storage_backend()
    result = await backend.upload(
        file_data=data,
        filename=file.filename or "image.png",
        content_type=file.content_type or "image/png",
        folder=folder,
    )

    return success_response(
        data={
            "url": result.url,
            "filename": result.filename,
            "size": result.size,
        },
        message="上传成功",
    )


@router.post("/images")
async def upload_images(
    files: list[UploadFile] = File(...),
    folder: str = Form("images"),
    current_user: dict = Depends(get_current_user),
):
    results = []
    backend = _get_storage_backend()

    for file in files:
        data = await file.read()
        _validate_image(file.filename or "unknown", len(data))
        result = await backend.upload(
            file_data=data,
            filename=file.filename or "image.png",
            content_type=file.content_type or "image/png",
            folder=folder,
        )
        results.append({
            "url": result.url,
            "filename": result.filename,
            "size": result.size,
        })

    return success_response(data=results, message=f"成功上传 {len(results)} 个文件")