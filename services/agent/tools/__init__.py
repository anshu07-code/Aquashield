
"""Tool wrappers for the Aquashield AI agent."""

try:
    from .. import api_client
except ImportError:
    import api_client


def get_zone_risk(zone_id: str) -> dict:
    """Get normalized flood-risk details for a zone."""
    result = api_client.get_zone_risk(zone_id)
    breakdown = result.get("breakdown", {})
    zone = result.get("zone", {})

    return {
        "zone": zone,
        "risk": breakdown.get("risk", zone.get("risk")),
        "tier": breakdown.get("tier", zone.get("tier")),
        "factors": breakdown.get("factors", {}),
        "rain": result.get("rain", {}),
        "forecast": result.get("forecast", []),
        "reports": result.get("reports", []),
    }


def get_forecast(zone_id: str) -> dict:
    """Get the rainfall forecast for a zone."""
    forecast = api_client.get_forecast(zone_id)

    return {
        "forecast": forecast,
        "count": len(forecast),
    }


def get_nearby_reports(zone_id: str, radius_m: int = 150) -> dict:
    """Get nearby reports and their verification counts."""
    result = api_client.get_nearby_reports(zone_id, radius_m)
    reports = result.get("reports", [])

    return {
        "reports": reports,
        "totalCount": len(reports),
        "verifiedCount": sum(
            1 for report in reports
            if report.get("status") == "verified"
        ),
    }


def get_nearby_zones(zone_id: str) -> dict:
    """Get the available zone summaries."""
    result = api_client.get_zone_list()
    zones = result.get("zones", [])

    return {
        "zones": [zone for zone in zones if zone.get("id") != zone_id],
        "count": sum(1 for zone in zones if zone.get("id") != zone_id),
    }


def plan_safe_route(origin: dict, destination: dict) -> dict:
    """Plan a route while considering flood hazards."""
    result = api_client.plan_safe_route(origin, destination)
    routes = result.get("routes", [])

    return {
        **result,
        "routes": routes,
        "routeCount": len(routes),
    }


def create_work_order(
    zone_id: str,
    work_type: str,
    priority: str,
    note: str,
    execute: bool = False,
) -> dict:
    """Preview or create a work order."""
    if not execute:
        return {
            "dryRun": True,
            "id": None,
            "zoneId": zone_id,
            "type": work_type,
            "priority": priority,
            "note": note,
        }

    result = api_client.create_work_order(
        zone_id, work_type, priority, note
    )
    return {**result, "dryRun": False}


def draft_alert(zone_id: str, lang: str = "en", text: str = "") -> dict:
    """Create a draft alert."""
    return api_client.draft_alert(zone_id, lang, text)


def publish_alert(alert_id: str, execute: bool = False) -> dict:
    """Preview or publish an alert."""
    if not execute:
        return {
            "dryRun": True,
            "id": alert_id,
            "status": "draft",
        }

    result = api_client.publish_alert(alert_id)
    return {**result, "dryRun": False}


__all__ = [
    "get_zone_risk",
    "get_forecast",
    "get_nearby_reports",
    "get_nearby_zones",
    "plan_safe_route",
    "create_work_order",
    "draft_alert",
    "publish_alert",
]
