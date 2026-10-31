"""Invoice numbers: INV-<year>-<6-digit sequence>. Uniqueness is enforced by the DB."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func
from sqlmodel import Session, select

from app.models import Invoice


def generate_invoice_number(session: Session, issued_date: date) -> str:
    prefix = f"INV-{issued_date.year}-"
    count = session.exec(
        select(func.count()).select_from(Invoice).where(Invoice.invoice_number.startswith(prefix))
    ).one()
    return f"{prefix}{count + 1:06d}"