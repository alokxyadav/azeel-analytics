import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(254), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_picture = Column(Text, nullable=True)
    theme = Column(String(10), default="light", nullable=False)
    created_at = Column(DateTime, default=now_utc, nullable=False)
    email_verified_at = Column(DateTime, nullable=True)

    @property
    def email_verified(self) -> bool:
        return self.email_verified_at is not None

    files = relationship("UploadedFile", back_populates="owner", cascade="all, delete-orphan", passive_deletes=True)


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(String, primary_key=True, default=gen_uuid)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String, nullable=False)
    file_type = Column(String(10), nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    column_count = Column(Integer, default=0, nullable=False)
    size_bytes = Column(Integer, default=0, nullable=False)
    uploaded_at = Column(DateTime, default=now_utc, nullable=False)

    owner = relationship("User", back_populates="files")


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(254), nullable=False)
    message = Column(Text, nullable=False)
    ip = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=now_utc, nullable=False)


class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String(254), unique=True, nullable=False)
    created_at = Column(DateTime, default=now_utc, nullable=False)
