from app.checker import derive_status
from app.schemas import HealthStatus


def test_healthy_status() -> None:
    status, drift, latency = derive_status(200, 120, 500, "1.2.3", "1.2.3", None)
    assert status == HealthStatus.HEALTHY
    assert drift is False
    assert latency is False


def test_latency_degradation() -> None:
    status, drift, latency = derive_status(200, 900, 500, "1.2.3", "1.2.3", None)
    assert status == HealthStatus.DEGRADED
    assert drift is False
    assert latency is True


def test_version_drift_degradation() -> None:
    status, drift, latency = derive_status(200, 200, 500, "1.2.3", "1.2.4", None)
    assert status == HealthStatus.DEGRADED
    assert drift is True
    assert latency is False


def test_missing_version_stays_healthy() -> None:
    status, drift, latency = derive_status(200, 200, 500, "1.2.3", None, None)
    assert status == HealthStatus.HEALTHY
    assert drift is False
    assert latency is False


def test_timeout_is_down() -> None:
    status, drift, latency = derive_status(None, None, 500, "1.2.3", None, "Request timed out.")
    assert status == HealthStatus.DOWN
    assert drift is False
    assert latency is False


def test_non_2xx_is_down() -> None:
    status, drift, latency = derive_status(503, 200, 500, "1.2.3", "1.2.3", "Non-2xx response: 503")
    assert status == HealthStatus.DOWN
