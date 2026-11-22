from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.utils import safe_download_stem
from app.models.models import User
from app.routers.analytics import _load
from app.services import data_service as ds
from app.services import report_service as rs

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _download(content: bytes, media_type: str, filename: str) -> Response:
    return Response(content=content, media_type=media_type, headers={
        "Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store",
    })


@router.get("/{file_id}/csv")
def download_csv(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record, df = _load(file_id, user, db)
    return _download(rs.dataframe_to_csv_bytes(ds.clean_dataframe_for_export(df)), "text/csv",
                     f"{safe_download_stem(record.original_filename)}_cleaned.csv")


@router.get("/{file_id}/excel")
def download_excel(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record, df = _load(file_id, user, db)
    clean = ds.clean_dataframe_for_export(df)
    if len(clean) > rs.EXCEL_MAX_ROWS:
        raise HTTPException(status_code=400, detail="This file has more rows than an Excel sheet can hold. Download the CSV instead.")
    return _download(rs.dataframe_to_excel_bytes(clean),
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     f"{safe_download_stem(record.original_filename)}_cleaned.xlsx")


@router.get("/{file_id}/pdf")
def download_pdf(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record, df = _load(file_id, user, db)
    pdf = rs.build_pdf_summary(
        record.original_filename, len(df), len(df.columns), ds.get_duplicate_count(df), int(df.isna().sum().sum()),
        ds.get_numeric_stats(df), ds.get_categorical_stats(df),
    )
    return _download(pdf, "application/pdf", f"{safe_download_stem(record.original_filename)}_summary.pdf")
