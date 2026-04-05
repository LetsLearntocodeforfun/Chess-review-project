"""Weekly reports router."""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from db import async_session
from models.schemas import ReportRequest
from services.report_service import generate_weekly_report

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate")
async def generate_report(request: ReportRequest):
    """Generate a weekly report for a user."""
    try:
        week_start = datetime.fromisoformat(request.weekStart)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid weekStart date format")

    async with async_session() as db:
        report_data = await generate_weekly_report(db, request.userId, week_start)

    return report_data
