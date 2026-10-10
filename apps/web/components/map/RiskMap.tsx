"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng, RouteOption, ZoneSummary } from "@aquashield/types";
import { TIER_META } from "@/lib/tiers";

const DELHI: [number, number] = [77.215, 28.615];

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      ],
      tileSize: 256,
      maxzoom: 20,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#060a14" },
    },
    { id: "carto", type: "raster", source: "carto", minzoom: 0, maxzoom: 22 },
  ],
};

type Props = {
  zones: ZoneSummary[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  routes?: RouteOption[] | null;
  selectedRouteId?: string | null;
  userLocation?: LatLng | null;
  simActive?: boolean;
};

function buildMarker(zone: ZoneSummary, selected: boolean): HTMLButtonElement {
  const meta = TIER_META[zone.tier];
  const pulse = zone.risk >= 55;
  const el = document.createElement("button");
  el.type = "button";
  el.className = `zone-marker${pulse ? " is-pulse" : ""}${selected ? " is-selected" : ""}`;
  el.style.color = meta.color;
  el.setAttribute("aria-label", `${zone.name}, risk ${zone.risk}, ${meta.label}`);
  const dot = document.createElement("span");
  dot.className = "zm-dot";
  dot.style.background = meta.color;
  dot.style.boxShadow = `0 0 0 3px ${meta.color}30, 0 6px 16px -4px rgba(0,0,0,.8)`;
  dot.textContent = String(zone.risk);
  const ring = document.createElement("span");
  ring.className = "zm-ring";
  const pulseEl = document.createElement("span");
  pulseEl.className = "zm-pulse";
  const label = document.createElement("span");
  label.className = "zm-label";
  label.textContent = zone.name;
  el.append(pulseEl, ring, dot, label);
  return el;
}

export default function RiskMap({
  zones,
  selectedId,
  onSelect,
  routes,
  selectedRouteId,
  userLocation,
  simActive = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);

  // keep the latest callback without re-initialising the map on every render
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // ---- init ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: DELHI,
      zoom: 10.6,
      pitch: 0,
      attributionControl: { compact: true },
      dragRotate: false,
      touchZoomRotate: true,
      cooperativeGestures: false,
      fadeDuration: 240,
    });
    mapRef.current = map;
    map.on("load", () => setReady(true));
    map.on("click", () => onSelectRef.current(null));
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // ---- fit to zones once we have them ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || zones.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    zones.forEach((z) => bounds.extend([z.lng, z.lat]));
    const fit = () =>
      map.fitBounds(bounds, { padding: { top: 90, bottom: 120, left: 60, right: 60 }, duration: 900, maxZoom: 13 });
    const t = setTimeout(fit, 120);
    return () => clearTimeout(t);
    // only on the first real zone batch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, zones.length > 0]);

  // ---- markers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    for (const zone of zones) {
      const el = buildMarker(zone, zone.id === selectedId);
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([zone.lng, zone.lat])
        .addTo(map);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectRef.current(zone.id);
      });
      markersRef.current.set(zone.id, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, selectedId]);

  // ---- fly to selection ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const zone = zones.find((z) => z.id === selectedId);
    if (!zone) return;
    map.flyTo({
      center: [zone.lng, zone.lat],
      zoom: Math.max(map.getZoom(), 12.4),
      duration: 850,
      essential: true,
    });
  }, [selectedId, ready, zones]);

  // ---- routes ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    // clear previous route layers/sources
    const layers = map.getStyle()?.layers ?? [];
    for (const l of layers) {
      if (l.id.startsWith("route-")) {
        if (map.getLayer(l.id)) map.removeLayer(l.id);
      }
    }
    const sources = Object.keys(map.getStyle()?.sources ?? {});
    for (const s of sources) {
      if (s.startsWith("route-") && map.getSource(s)) map.removeSource(s);
    }
    if (!routes || routes.length === 0) return;

    routes.forEach((route) => {
      const id = `route-${route.id}`;
      const recommended = route.recommended;
      const isSel = route.id === selectedRouteId;
      const color = route.unsafe ? "#fb4d63" : recommended ? "#22d3ee" : "#8ea3c4";
      map.addSource(id, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: route.geometry },
        },
      });
      // soft glow underlay
      map.addLayer({
        id: `${id}-glow`,
        type: "line",
        source: id,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": color,
          "line-width": recommended ? 13 : 8,
          "line-opacity": isSel ? 0.22 : 0.1,
          "line-blur": 6,
        },
      });
      map.addLayer({
        id,
        type: "line",
        source: id,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": color,
          "line-width": isSel ? 6 : 4,
          "line-opacity": isSel ? 1 : 0.55,
          "line-dasharray": route.unsafe ? [1.2, 1.6] : [1, 0],
        },
      });
    });
  }, [routes, selectedRouteId, ready]);

  // ---- fit to selected route ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedRouteId || !routes) return;
    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route || route.geometry.length < 2) return;
    const coords = route.geometry;
    const bounds = new maplibregl.LngLatBounds();
    coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    map.fitBounds(bounds, { padding: { top: 120, bottom: 160, left: 80, right: 480 }, duration: 900, maxZoom: 14 });
  }, [selectedRouteId, ready, routes]);

  // ---- user location ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!userLocation) return;
    const el = document.createElement("div");
    el.className = "user-dot";
    userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: Math.max(map.getZoom(), 12.8),
      duration: 900,
      essential: true,
    });
  }, [userLocation]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      {simActive ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-500/[0.05] to-transparent" />
      ) : null}
    </div>
  );
}
