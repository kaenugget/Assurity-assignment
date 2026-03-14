from __future__ import annotations

from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .checker import MonitoringCoordinator


def build_scheduler(coordinator: MonitoringCoordinator, interval_seconds: int) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        coordinator.run_cycle,
        "interval",
        seconds=interval_seconds,
        args=["scheduled"],
        id="assureops-monitor",
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now(UTC) + timedelta(seconds=2),
    )
    return scheduler
