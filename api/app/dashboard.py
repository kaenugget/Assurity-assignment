from __future__ import annotations

from .schemas import LayoutSuggestionItem

WIDGET_TYPES = [
    "fleetOverview",
    "environmentHealth",
    "platformFootprint",
    "versionDrift",
    "latencyTrends",
    "recentIncidents",
    "servicesTable",
    "authJourneyHealth",
]


def default_layouts() -> dict[str, list[dict[str, int | str]]]:
    return {
        "lg": [
            {"i": "fleetOverview", "x": 0, "y": 0, "w": 3, "h": 2},
            {"i": "environmentHealth", "x": 3, "y": 0, "w": 3, "h": 3},
            {"i": "platformFootprint", "x": 6, "y": 0, "w": 3, "h": 3},
            {"i": "versionDrift", "x": 9, "y": 0, "w": 3, "h": 3},
            {"i": "authJourneyHealth", "x": 0, "y": 2, "w": 6, "h": 4},
            {"i": "latencyTrends", "x": 6, "y": 3, "w": 6, "h": 4},
            {"i": "recentIncidents", "x": 0, "y": 6, "w": 5, "h": 4},
            {"i": "servicesTable", "x": 5, "y": 7, "w": 7, "h": 5},
        ],
        "md": [
            {"i": "fleetOverview", "x": 0, "y": 0, "w": 4, "h": 2},
            {"i": "environmentHealth", "x": 4, "y": 0, "w": 4, "h": 3},
            {"i": "platformFootprint", "x": 8, "y": 0, "w": 4, "h": 3},
            {"i": "versionDrift", "x": 0, "y": 2, "w": 4, "h": 3},
            {"i": "authJourneyHealth", "x": 4, "y": 3, "w": 8, "h": 4},
            {"i": "latencyTrends", "x": 0, "y": 5, "w": 6, "h": 4},
            {"i": "recentIncidents", "x": 6, "y": 7, "w": 6, "h": 4},
            {"i": "servicesTable", "x": 0, "y": 9, "w": 12, "h": 5},
        ],
        "sm": [
            {"i": "fleetOverview", "x": 0, "y": 0, "w": 2, "h": 2},
            {"i": "environmentHealth", "x": 0, "y": 2, "w": 2, "h": 3},
            {"i": "platformFootprint", "x": 0, "y": 5, "w": 2, "h": 3},
            {"i": "versionDrift", "x": 0, "y": 8, "w": 2, "h": 3},
            {"i": "authJourneyHealth", "x": 0, "y": 11, "w": 2, "h": 4},
            {"i": "latencyTrends", "x": 0, "y": 15, "w": 2, "h": 4},
            {"i": "recentIncidents", "x": 0, "y": 19, "w": 2, "h": 4},
            {"i": "servicesTable", "x": 0, "y": 23, "w": 2, "h": 5},
        ],
    }


def flatten_layout_suggestion(layout: list[LayoutSuggestionItem]) -> dict[str, list[dict[str, int | str]]]:
    lg = [{"i": item.widget_type, "x": item.x, "y": item.y, "w": item.w, "h": item.h} for item in layout]
    return {"lg": lg, "md": default_layouts()["md"], "sm": default_layouts()["sm"]}
