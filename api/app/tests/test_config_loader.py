from pathlib import Path

import pytest

from app.config_loader import load_services


def test_load_services_expands_explicit_substitutions(tmp_path: Path) -> None:
    config_path = tmp_path / "services.yaml"
    config_path.write_text(
        """
services:
  - name: Demo Service
    url: ${SELF_BASE_URL}/demo/healthy
    expected_version: "2026.03.14"
""".strip(),
        encoding="utf-8",
    )

    services = load_services(str(config_path), {"SELF_BASE_URL": "http://127.0.0.1:10000"})

    assert len(services) == 1
    assert services[0].url == "http://127.0.0.1:10000/demo/healthy"


def test_load_services_uses_placeholder_defaults(tmp_path: Path) -> None:
    config_path = tmp_path / "services.yaml"
    config_path.write_text(
        """
services:
  - name: Demo Service
    url: ${SELF_BASE_URL:-http://127.0.0.1:8000}/demo/down
    expected_version: "2026.03.14"
""".strip(),
        encoding="utf-8",
    )

    services = load_services(str(config_path))

    assert len(services) == 1
    assert services[0].url == "http://127.0.0.1:8000/demo/down"


def test_load_services_rejects_missing_placeholders(tmp_path: Path) -> None:
    config_path = tmp_path / "services.yaml"
    config_path.write_text(
        """
services:
  - name: Demo Service
    url: ${SELF_BASE_URL}/demo/flaky
    expected_version: "2026.03.14"
""".strip(),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="SELF_BASE_URL"):
        load_services(str(config_path))
