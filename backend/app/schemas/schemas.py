from datetime import UTC, datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes. They are always UTC, so label them so clients parse them correctly.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


UtcDatetime = Annotated[datetime, AfterValidator(_as_utc)]

COMMON_PASSWORDS = {
    "password", "password1", "password12", "password123", "12345678", "123456789", "1234567890",
    "qwertyuiop", "qwerty123", "iloveyou1", "11111111", "00000000", "abcdefgh", "admin1234",
}


def _check_password(value: str) -> str:
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be 72 bytes or fewer.")
    if not value.strip():
        raise ValueError("Password cannot be blank.")
    if value.lower() in COMMON_PASSWORDS:
        raise ValueError("That password is too common. Choose something harder to guess.")
    return value


Password = Annotated[str, Field(min_length=8), AfterValidator(_check_password)]


# ---------- Auth ----------

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: Password

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    remember: bool = True


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: EmailStr
    profile_picture: str | None = None
    theme: str
    email_verified: bool
    created_at: UtcDatetime


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: Password


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    theme: str | None = None
    # Small avatar as a data URL (the client downsizes it); empty string removes it.
    profile_picture: str | None = Field(default=None, max_length=300_000)


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str = Field(max_length=2000)
    new_password: Password


class VerifyEmail(BaseModel):
    token: str = Field(max_length=2000)


class DeleteAccount(BaseModel):
    password: str = Field(max_length=200)


# ---------- Public forms ----------

class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    message: str = Field(min_length=10, max_length=5000)
    website: str = Field(default="", max_length=200)  # honeypot: real users leave it empty


class SubscribeIn(BaseModel):
    email: EmailStr
    website: str = Field(default="", max_length=200)


# ---------- Files and analytics ----------

class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    original_filename: str
    file_type: str
    row_count: int
    column_count: int
    size_bytes: int
    uploaded_at: UtcDatetime


class ColumnInfo(BaseModel):
    name: str
    dtype: str
    missing_count: int
    missing_pct: float
    unique_count: int


class DataPreview(BaseModel):
    file: FileOut
    columns: list[ColumnInfo]
    duplicate_rows: int
    total_rows: int
    total_columns: int
    preview_rows: list[dict[str, Any]]
    page: int
    page_size: int
    total_pages: int


class SummaryStat(BaseModel):
    column: str
    mean: float | None = None
    median: float | None = None
    minimum: float | None = None
    maximum: float | None = None
    std_dev: float | None = None
    nulls: int
    unique: int
    dtype: str


class AnalyticsResponse(BaseModel):
    file: FileOut
    numeric_stats: list[SummaryStat]
    categorical_stats: list[SummaryStat]
    duplicate_rows: int
    total_missing_cells: int


class ChartDataset(BaseModel):
    chart_type: str
    title: str
    labels: list[str]
    values: list[float]
    column: str
