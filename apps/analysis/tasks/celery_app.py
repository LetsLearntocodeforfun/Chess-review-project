"""Celery app configuration and shared tasks."""

from celery import Celery

from config import settings

celery_app = Celery(
    "chesslens",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "tasks.analysis_tasks",
        "tasks.import_tasks",
        "tasks.report_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max per task
    task_soft_time_limit=540,  # Soft limit at 9 minutes
    worker_prefetch_multiplier=1,  # One task at a time (Stockfish is CPU-heavy)
    # Beat schedule for periodic tasks
    beat_schedule={
        "weekly-reports": {
            "task": "tasks.report_tasks.generate_all_weekly_reports",
            "schedule": 604800.0,  # Every 7 days
        },
        "auto-import": {
            "task": "tasks.import_tasks.auto_import_all_users",
            "schedule": 21600.0,  # Every 6 hours
        },
    },
)
