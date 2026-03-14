import httpx

from app.schemas import VersionSourceType
from app.version_parser import extract_version


def build_response(body: str, headers: dict[str, str] | None = None) -> httpx.Response:
    request = httpx.Request("GET", "http://testserver/service")
    return httpx.Response(200, headers=headers, text=body, request=request)


def test_extract_json_version() -> None:
    response = build_response('{"meta":{"version":"2026.03.14"}}')
    assert extract_version(response, VersionSourceType.JSON, "meta.version") == "2026.03.14"


def test_extract_header_version_case_insensitive() -> None:
    response = build_response("ok", headers={"x-service-version": "1.2.3"})
    assert extract_version(response, VersionSourceType.HEADER, "X-Service-Version") == "1.2.3"


def test_extract_regex_capture() -> None:
    response = build_response('{"version":"9.9.9"}')
    assert extract_version(response, VersionSourceType.REGEX, '"version":"([^"]+)"') == "9.9.9"


def test_extract_regex_miss_returns_none() -> None:
    response = build_response('{"meta":{"version":"9.9.9"}}')
    assert extract_version(response, VersionSourceType.REGEX, "release=([^\\s]+)") is None


def test_extract_invalid_json_returns_none() -> None:
    response = build_response("not-json")
    assert extract_version(response, VersionSourceType.JSON, "meta.version") is None


def test_extract_none_version_source() -> None:
    response = build_response('{"meta":{"version":"9.9.9"}}')
    assert extract_version(response, VersionSourceType.NONE, None) is None
