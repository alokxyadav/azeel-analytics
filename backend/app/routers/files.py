import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import limiter, too_many
from app.core.utils import clean_display_name
from app.models.models import UploadedFile, User
from app.schemas.schemas import FileOut
from app.services import data_service
from app.services.data_service import DataError

router = APIRouter(prefix="/api/files", tags=["Files"])
log = logging.getLogger("azeel.files")
CHUNK = 1024 * 1024


def get_file_or_404(file_id: str, user: User, db: Session) -> UploadedFile:
    record = db.query(UploadedFile).filter(UploadedFile.id == file_id, UploadedFile.owner_id == user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found.")
    return record


def get_filepath(record: UploadedFile) -> str:
    return os.path.join(settings.UPLOAD_DIR, record.owner_id, record.stored_filename)


@router.post("/upload", response_model=FileOut, status_code=201)
def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Plain `def`: parsing is CPU-bound, so FastAPI runs it in a worker thread instead of blocking the event loop.
    if settings.verification_required and not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Verify your email address to upload files. Check your inbox, or request a new link from the banner.",
        )
    retry = limiter.check(f"upload:{user.id}", 30, 3600)
    if retry:
        raise too_many(retry)

    display_name = clean_display_name(file.filename or "")
    ext = os.path.splitext(display_name)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext or 'none'}'. Upload a .csv or .xlsx file.")
    file_type = ext.lstrip(".")

    count, used = db.query(func.count(UploadedFile.id), func.coalesce(func.sum(UploadedFile.size_bytes), 0)) \
        .filter(UploadedFile.owner_id == user.id).one()
    if count >= settings.MAX_FILES_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"You have reached the limit of {settings.MAX_FILES_PER_USER} files. Delete some to upload more.",
        )
    if used >= settings.MAX_STORAGE_PER_USER_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail="You have used all of your storage. Delete some files to upload more.")

    user_dir = os.path.join(settings.UPLOAD_DIR, user.id)
    os.makedirs(user_dir, exist_ok=True)
    stored = f"{uuid.uuid4()}.{file_type}"
    final_path = os.path.join(user_dir, stored)
    part_path = final_path + ".part"

    try:
        size = 0
        with open(part_path, "wb") as out:
            while chunk := file.file.read(CHUNK):
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    raise HTTPException(status_code=413, detail=f"That file is larger than the {settings.MAX_UPLOAD_SIZE_MB} MB limit.")
                out.write(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="That file is empty.")
        try:
            df = data_service.read_dataframe(part_path, file_type)
        except DataError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        os.replace(part_path, final_path)
        rows, cols = len(df), len(df.columns)
    except BaseException:
        for p in (part_path, final_path):
            if os.path.exists(p):
                os.remove(p)
        raise

    record = UploadedFile(owner_id=user.id, original_filename=display_name, stored_filename=stored,
                          file_type=file_type, row_count=rows, column_count=cols, size_bytes=size)
    try:
        db.add(record)
        db.commit()
    except Exception:
        os.remove(final_path)
        raise
    db.refresh(record)
    log.info("Uploaded %s (%d bytes, %d rows) for user %s", display_name, size, rows, user.id)
    return record


@router.get("", response_model=list[FileOut])
def list_files(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(UploadedFile).filter(UploadedFile.owner_id == user.id).order_by(UploadedFile.uploaded_at.desc()).all()


@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = get_file_or_404(file_id, user, db)
    path = get_filepath(record)
    db.delete(record)
    db.commit()
    data_service.evict(path)
    if os.path.exists(path):
        os.remove(path)
