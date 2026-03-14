from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import yaml

from .schemas import ServiceConfig

ENV_VAR_PATTERN = re.compile(r"\$\{([A-Z0-9_]+)(?::-([^}]*))?\}")


def slugify(value: str) -> str:
    lowered = value.strip().lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", lowered)
    return normalized.strip("-")


def _expand_placeholders(raw: str, substitutions: dict[str, str] | None = None) -> str:
    values = {key: value for key, value in os.environ.items()}
    if substitutions:
        values.update({key: value for key, value in substitutions.items() if value is not None})

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        default = match.group(2)
        value = values.get(key)
        if value:
            return value
        if default is not None:
            return default
        raise ValueError(f"Missing required config placeholder: {key}")

    return ENV_VAR_PATTERN.sub(replace, raw)


def _load_file(path: Path, substitutions: dict[str, str] | None = None) -> dict[str, Any]:
    raw = _expand_placeholders(path.read_text(encoding="utf-8"), substitutions)
    if path.suffix.lower() == ".json":
        data = json.loads(raw)
    else:
        data = yaml.safe_load(raw)
    if not isinstance(data, dict):
        raise ValueError("Service config must be an object with a 'services' key.")
    return data


def load_services(path_str: str, substitutions: dict[str, str] | None = None) -> list[ServiceConfig]:
    path = Path(path_str)
    if not path.exists():
        raise FileNotFoundError(f"Service config file not found: {path}")

    data = _load_file(path, substitutions)
    services = data.get("services", [])
    if not isinstance(services, list):
        raise ValueError("'services' must be a list.")

    loaded: list[ServiceConfig] = []
    for entry in services:
        if not isinstance(entry, dict):
            raise ValueError("Each service entry must be an object.")
        environment = entry.get("environment") or "default"
        service_key = f"{environment}-{slugify(entry['name'])}"
        loaded.append(ServiceConfig.model_validate({**entry, "service_key": service_key}))
    return loaded
