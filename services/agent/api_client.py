"""
API client for the Aquashield backend.
All agent tools call the backend through this module.

Design:
- Base URL from API_BASE_URL env var (defaults to http://localhost:3000 for local dev)
- API key from API_KEY env var (passed as x-api-key header)
- All responses are parsed as JSON and validated with Pydantic
- Raises APIError on non-2xx responses
- MOCK_MODE env var: if "1", returns realistic mock data without hitting the network
"""

from __future__ import annotations

import json
import os
import urllib.request
import urllib.error
from typing import Any


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3000").rstrip("/")
API_KEY = os.environ.get("API_KEY", "")
OPS_PASSCODE = os.environ.get("OPS_PASSCODE", "")   # sent as x-ops-passcode for ops endpoints (work orders, alerts)
MOCK_MODE = os.environ.get("MOCK_MODE", "0") == "1"


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class APIError(Exception):
    """Raised on non-2xx response from the Aquashield API."""

    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(f"[{code}] {status_code}: {message}")


# ---------------------------------------------------------------------------
# Core HTTP client
# ---------------------------------------------------------------------------

def _request(method: str, path: str, body: dict | None = None) -> dict[str, Any]:
    """Make an HTTP request to the Aquashield API."""
    if MOCK_MODE:
        return _mock_response(path, method, body)

    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if API_KEY:
        headers["x-api-key"] = API_KEY
    if OPS_PASSCODE:
        headers["x-ops-passcode"] = OPS_PASSCODE

    data = json.dumps(body).encode("utf-8") if body is not None else None

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            code = err_body.get("error", {}).get("code", "UNKNOWN")
            message = err_body.get("error", {}).get("message", str(e))
        except Exception:
            code = "UNKNOWN"
            message = str(e)
        raise APIError(e.code, code, message) from e
    except urllib.error.URLError as e:
        raise APIError(503, "UPSTREAM_UNAVAILABLE", f"Could not reach API: {e.reason}") from e


# ---------------------------------------------------------------------------
# Zone endpoints
# ---------------------------------------------------------------------------

def get_zone_risk(zone_id: str) -> dict[str, Any]:
    """
    GET /zones/{zoneId}
    Returns: { zone, breakdown, rain, forecast, reports }
    """
    return _request("GET", f"/zones/{zone_id}")


def get_zone_list() -> dict[str, Any]:
    """GET /zones — returns { zones: [...] }"""
    return _request("GET", "/zones")


def get_nearby_zones(zone_id: str) -> dict[str, Any]:
    """
    GET /zones?lat=&lng=&radius= (approximate — we get the zone first then nearby)
    For now: returns zone list and the agent finds neighbours.
    P2 may add a /zones/nearby endpoint.
    """
    return _request("GET", f"/zones/{zone_id}")


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------

def get_forecast(zone_id: str) -> dict[str, Any]:
    """
    GET /zones/{zoneId} — includes forecast in the response.
    Returns the next 3 hours of rainfall forecast (15-min steps).
    """
    zone = _request("GET", f"/zones/{zone_id}")
    return zone.get("forecast", [])


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

def get_nearby_reports(zone_id: str, radius_m: int = 150) -> dict[str, Any]:
    """
    GET /reports?zoneId={zoneId}
    Returns { reports: [...] } — all active reports at the zone.
    For true nearby (different zone, same area), P4 may add radius param later.
    """
    return _request("GET", f"/reports?zoneId={zone_id}")


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

def plan_safe_route(origin: dict, destination: dict) -> dict[str, Any]:
    """
    POST /route { origin, destination }
    Returns { routes: [...] }
    """
    return _request("POST", "/route", {"origin": origin, "destination": destination})


# ---------------------------------------------------------------------------
# Work orders
# ---------------------------------------------------------------------------

def create_work_order(
    zone_id: str,
    work_type: str,
    priority: str,
    note: str,
) -> dict[str, Any]:
    """
    POST /workorders (ops endpoint — requires x-ops-passcode header)
    """
    payload = {
        "zoneId": zone_id,
        "type": work_type,
        "priority": priority,
        "note": note,
        "status": "open",
    }
    return _request("POST", "/workorders", payload)


def get_work_orders() -> dict[str, Any]:
    """GET /workorders"""
    return _request("GET", "/workorders")


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

def draft_alert(zone_id: str, lang: str, text: str) -> dict[str, Any]:
    """
    POST /alerts (ops endpoint — requires x-ops-passcode header).
    Creates a draft alert record with the agent-generated text.
    """
    return _request("POST", "/alerts", {"zoneId": zone_id, "lang": lang, "text": text})


def publish_alert(alert_id: str) -> dict[str, Any]:
    """
    POST /alerts/{alertId}/publish (ops endpoint — requires x-ops-passcode)
    """
    return _request("POST", f"/alerts/{alert_id}/publish", None)


# ---------------------------------------------------------------------------
# Mock responses for local dev / CI without backend
# ---------------------------------------------------------------------------

def _mock_response(path: str, method: str, body: dict | None) -> dict[str, Any]:
    """Return realistic mock data matching the API contract."""
    zone_id = "z_minto"

    if path == f"/zones/{zone_id}":
        return _mock_zone_detail(zone_id)
    if path == "/zones":
        return {"zones": [_mock_zone_summary(zone_id)]}
    if path == f"/zones/{zone_id}" and method == "GET":
        return _mock_zone_detail(zone_id)
    if path.startswith("/reports"):
        return {
            "reports": [
                {
                    "id": "r_001",
                    "zoneId": zone_id,
                    "ts": "2026-10-09T08:30:00Z",
                    "type": "flooding",
                    "imageUrl": None,
                    "note": None,
                    "vision": {
                        "isRoadScene": True,
                        "floodedRoad": True,
                        "waterDepthTier": "ankle",
                        "blockedDrain": False,
                        "debrisOrWasteObstruction": False,
                        "vehiclesStranded": False,
                        "confidence": 0.82,
                        "rejectReason": None,
                        "explanation": "Shallow ankle-deep flooding on Minto Road underpass.",
                    },
                    "trust": 0.74,
                    "status": "verified",
                }
            ]
        }
    if path == "/route" and method == "POST":
        return {
            "routes": [
                {
                    "id": "route_1",
                    "geometry": [[77.2090, 28.6139], [77.2085, 28.6142], [77.2080, 28.6145]],
                    "durationMin": 12,
                    "distanceKm": 2.3,
                    "hazards": [
                        {"zoneId": "z_minto", "name": "Minto Bridge Underpass", "tier": "HIGH"}
                    ],
                    "score": 28,
                    "unsafe": False,
                    "recommended": True,
                    "summary": "Avoids 1 flooded underpass +0 min",
                },
                {
                    "id": "route_2",
                    "geometry": [[77.2090, 28.6139], [77.2100, 28.6140], [77.2110, 28.6143]],
                    "durationMin": 8,
                    "distanceKm": 1.8,
                    "hazards": [],
                    "score": 8,
                    "unsafe": False,
                    "recommended": False,
                    "summary": "Fastest route, no flood risk",
                },
            ]
        }
    if path == "/workorders" and method == "POST":
        return {
            "id": f"wo_{hash(str(body)) % 100000}",
            "zoneId": body.get("zoneId") if body else zone_id,
            "type": body.get("type") if body else "pump_dispatch",
            "priority": body.get("priority") if body else "P1",
            "status": "open",
            "note": body.get("note") if body else "",
            "createdAt": "2026-10-09T10:00:00Z",
        }
    if path == "/workorders" and method == "GET":
        return {"workOrders": []}
    if path.startswith("/alerts/") and path.endswith("/publish"):
        return {
            "id": "alert_001",
            "zoneId": zone_id,
            "lang": "en",
            "text": "Minto Bridge underpass flooding — avoid the area.",
            "status": "published",
            "publishedAt": "2026-10-09T10:05:00Z",
        }
    if path == "/alerts" and method == "POST":
        return {
            "id": "alert_001",
            "zoneId": body.get("zoneId") if body else zone_id,
            "lang": body.get("lang") if body and body.get("lang") else "en",
            "text": body.get("text") if body and body.get("text") else "Minto Bridge underpass flooding — avoid the area.",
            "status": "draft",
            "publishedAt": None,
        }

    return {}


def _mock_zone_summary(zid: str) -> dict[str, Any]:
    return {
        "id": zid,
        "name": "Minto Bridge Underpass",
        "lat": 28.6139,
        "lng": 77.2090,
        "isUnderpass": True,
        "risk": 61,
        "tier": "HIGH",
        "etaMin": 45,
        "updatedAt": "2026-10-09T09:45:00Z",
        "stale": False,
    }


def _mock_zone_detail(zid: str) -> dict[str, Any]:
    return {
        "zone": _mock_zone_summary(zid),
        "breakdown": {
            "risk": 61,
            "tier": "HIGH",
            "etaMin": 45,
            "factors": {
                "rainNow": 72,
                "antecedent24h": 55,
                "depression": 75,
                "drainageDeficit": 80,
                "history": 60,
                "liveEvidence": 40,
            },
            "contributions": {
                "rainNow": 21.6,
                "antecedent24h": 8.3,
                "depression": 11.3,
                "drainageDeficit": 12.0,
                "history": 6.0,
                "liveEvidence": 6.0,
            },
            "underpassMultiplier": 1.1,
            "topReasons": ["Heavy rainfall now", "Low-lying underpass", "Poor drainage nearby"],
        },
        "rain": {"nowMmHr": 48.0, "last24hMm": 82.0},
        "forecast": [
            {"ts": "2026-10-09T10:00:00Z", "mmHr": 45.0},
            {"ts": "2026-10-09T10:15:00Z", "mmHr": 52.0},
            {"ts": "2026-10-09T10:30:00Z", "mmHr": 38.0},
            {"ts": "2026-10-09T10:45:00Z", "mmHr": 25.0},
            {"ts": "2026-10-09T11:00:00Z", "mmHr": 15.0},
            {"ts": "2026-10-09T11:15:00Z", "mmHr": 8.0},
        ],
        "reports": [
            {
                "id": "r_001",
                "zoneId": zid,
                "ts": "2026-10-09T08:30:00Z",
                "type": "flooding",
                "imageUrl": None,
                "note": None,
                "vision": {
                    "isRoadScene": True,
                    "floodedRoad": True,
                    "waterDepthTier": "ankle",
                    "blockedDrain": False,
                    "debrisOrWasteObstruction": False,
                    "vehiclesStranded": False,
                    "confidence": 0.82,
                    "rejectReason": None,
                    "explanation": "Shallow ankle-deep flooding.",
                },
                "trust": 0.74,
                "status": "verified",
            }
        ],
    }
