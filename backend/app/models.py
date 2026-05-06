from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    conditions_json: Mapped[str] = mapped_column(Text, nullable=False)
    last_simulation_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    rule_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    mode: Mapped[str] = mapped_column(String(32), nullable=False)
    start_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    query_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics_json: Mapped[str] = mapped_column(Text, nullable=False)
    warnings_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
