from __future__ import annotations

import re
from typing import Any

import httpx

from .schemas import VersionSourceType


def _json_lookup(payload: Any, key_path: str | None) -> str | None:
    if not key_path:
        return None
    cursor = payload
    for segment in key_path.split("."):
        if not isinstance(cursor, dict) or segment not in cursor:
            return None
        cursor = cursor[segment]
    if cursor is None:
        return None
    return str(cursor)


def extract_version(
    response: httpx.Response,
    source_type: VersionSourceType,
    source_key: str | None,
) -> str | None:
    if source_type == VersionSourceType.NONE:
        return None

    if source_type == VersionSourceType.HEADER:
        if not source_key:
            return None
        for key, value in response.headers.items():
            if key.lower() == source_key.lower():
                return value
        return None

    if source_type == VersionSourceType.JSON:
        try:
            payload = response.json()
        except ValueError:
            return None
        return _json_lookup(payload, source_key)

    if source_type == VersionSourceType.REGEX:
        if not source_key:
            return None
        match = re.search(source_key, response.text)
        if not match:
            return None
        if match.groups():
            return match.group(1)
        return match.group(0)

    return None
