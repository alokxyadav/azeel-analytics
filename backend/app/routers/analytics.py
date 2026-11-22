from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User
from app.routers.files import get_file_or_404, get_filepath
from app.schemas.schemas import AnalyticsResponse, ChartDataset, DataPreview, FileOut
from app.services import data_service as ds

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


def _load(file_id: str, user: User, db: Session):
    record = get_file_or_404(file_id, user, db)
    try:
        return record, ds.load_dataframe(get_filepath(record), record.file_type)
    except ds.DataError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="The stored file is missing. Please upload it again.") from None


@router.get("/{file_id}/preview", response_model=DataPreview)
def preview_data(
    file_id: str,
    page: int = Query(1, ge=1, le=1_000_000),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    sort_by: str | None = Query(None, max_length=200),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record, df = _load(file_id, user, db)
    view = ds.search_dataframe(df, search) if search else df
    if sort_by and sort_by in view.columns:
        view = ds.sort_dataframe(view, sort_by, sort_dir == "asc")
    rows, total_pages = ds.get_preview(view, page, page_size)
    return DataPreview(
        file=FileOut.model_validate(record), columns=ds.get_column_info(df), duplicate_rows=ds.get_duplicate_count(df),
        total_rows=len(view), total_columns=len(df.columns), preview_rows=rows,
        page=min(page, total_pages), page_size=page_size, total_pages=total_pages,
    )


@router.get("/{file_id}/summary", response_model=AnalyticsResponse)
def analytics_summary(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record, df = _load(file_id, user, db)
    return AnalyticsResponse(
        file=FileOut.model_validate(record), numeric_stats=ds.get_numeric_stats(df),
        categorical_stats=ds.get_categorical_stats(df), duplicate_rows=ds.get_duplicate_count(df),
        total_missing_cells=int(df.isna().sum().sum()),
    )


@router.get("/{file_id}/charts", response_model=list[ChartDataset])
def analytics_charts(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _, df = _load(file_id, user, db)
    return ds.generate_chart_data(df)
