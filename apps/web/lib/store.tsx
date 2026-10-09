"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { computeRisk } from "@aquashield/risk-core";
import type {
  LatLng,
  RiskBreakdown,
  RouteOption,
  ZoneDetail,
  ZoneSummary,
} from "@aquashield/types";
import {
  ApiError,
  fetchRoutes,
  fetchZoneDetail,
  fetchZones,
} from "@/lib/api";
import { getZoneSeed } from "@/lib/zoneStatic";
import type { Lang } from "@/lib/i18n";

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type AppState = {
  // zones
  zones: ZoneSummary[];
  zonesLoading: boolean;
  zonesError: string | null;
  reloadZones: () => void;

  // zone sheet
  selectedId: string | null;
  detail: ZoneDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  selectZone: (id: string) => void;
  closeZone: () => void;

  /** zones with the simulator applied (same array shape, risk/tier recomputed) */
  effectiveZones: ZoneSummary[];
  /** per-zone simulated breakdown when the simulator is active */
  simBreakdowns: Record<string, RiskBreakdown>;
  breakdownFor: (id: string) => RiskBreakdown | null;

  // rainfall simulator
  simRain: number | null;
  simActive: boolean;
  setSimRain: (mmHr: number | null) => void;
  startSim: () => void;
  resetSim: () => void;

  // routing
  routeOpen: boolean;
  routes: RouteOption[] | null;
  routeLoading: boolean;
  routeError: string | null;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;
  routeDestination: LatLng | null;
  openRoute: (destination?: LatLng) => void;
  closeRoute: () => void;
  findRoutes: (origin: LatLng, destination: LatLng) => Promise<void>;

  // report flow
  reportOpen: boolean;
  reportZoneId: string | null;
  openReport: (zoneId?: string | null) => void;
  closeReport: () => void;

  // geolocation
  userLocation: LatLng | null;
  locate: () => void;
  locationDenied: boolean;

  // language
  lang: Lang;
  setLang: (l: Lang) => void;

  // derived
  staleCount: number;
};

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Network request failed";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ZoneDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [simRain, setSimRainState] = useState<number | null>(null);

  const [routeOpen, setRouteOpen] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeDestination, setRouteDestination] = useState<LatLng | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportZoneId, setReportZoneId] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const [lang, setLang] = useState<Lang>("en");

  const reloadZones = useCallback(async () => {
    setZonesLoading(true);
    setZonesError(null);
    try {
      setZones(await fetchZones());
    } catch (e) {
      setZonesError(errMsg(e));
    } finally {
      setZonesLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    reloadZones();
  }, [reloadZones]);

  const selectZone = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      try {
        setDetail(await fetchZoneDetail(id));
      } catch (e) {
        setDetailError(errMsg(e));
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const closeZone = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  }, []);

  // ---- simulation ----
  const { effectiveZones, simBreakdowns } = useMemo(() => {
    if (simRain === null) return { effectiveZones: zones, simBreakdowns: {} as Record<string, RiskBreakdown> };
    const map: Record<string, RiskBreakdown> = {};
    const eff = zones.map((z) => {
      const seed = getZoneSeed(z.id);
      const breakdown = computeRisk(seed.statics, {
        rainNowMmHr: simRain,
        rain24hMm: seed.baseline.rain24hMm,
        reportTrusts: seed.baseline.reportTrusts,
      });
      map[z.id] = breakdown;
      return { ...z, risk: breakdown.risk, tier: breakdown.tier, etaMin: null };
    });
    return { effectiveZones: eff, simBreakdowns: map };
  }, [zones, simRain]);

  const startSim = useCallback(() => {
    if (simRain !== null) return;
    const ids = zones.map((z) => z.id);
    const avg =
      ids.length > 0
        ? Math.round(ids.reduce((s, id) => s + getZoneSeed(id).baselineRainMmHr, 0) / ids.length)
        : 25;
    setSimRainState(avg);
  }, [zones, simRain]);

  const resetSim = useCallback(() => setSimRainState(null), []);
  const setSimRain = useCallback((mmHr: number | null) => setSimRainState(mmHr), []);

  const breakdownFor = useCallback(
    (id: string): RiskBreakdown | null => {
      if (simRain !== null) return simBreakdowns[id] ?? null;
      if (detail?.zone.id === id) return detail.breakdown;
      return null;
    },
    [simRain, simBreakdowns, detail],
  );

  // ---- routing ----
  const findRoutes = useCallback(async (origin: LatLng, destination: LatLng) => {
    setRouteLoading(true);
    setRouteError(null);
    try {
      const list = await fetchRoutes(origin, destination);
      setRoutes(list);
      const rec = list.find((r) => r.recommended) ?? list[0];
      setSelectedRouteId(rec ? rec.id : null);
    } catch (e) {
      setRouteError(errMsg(e));
      setRoutes(null);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  const openRoute = useCallback((destination?: LatLng) => {
    if (destination) setRouteDestination(destination);
    setRouteOpen(true);
  }, []);

  const closeRoute = useCallback(() => {
    setRouteOpen(false);
    setRoutes(null);
    setRouteError(null);
    setSelectedRouteId(null);
    setRouteDestination(null);
  }, []);

  // ---- report ----
  const openReport = useCallback((zoneId?: string | null) => {
    setReportZoneId(zoneId ?? null);
    setReportOpen(true);
  }, []);

  const closeReport = useCallback(() => setReportOpen(false), []);

  // ---- geolocation ----
  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationDenied(false);
      },
      () => setLocationDenied(true),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, []);

  const staleCount = useMemo(() => zones.filter((z) => z.stale).length, [zones]);

  const value: AppState = {
    zones,
    zonesLoading,
    zonesError,
    reloadZones,
    selectedId,
    detail,
    detailLoading,
    detailError,
    selectZone,
    closeZone,
    effectiveZones,
    simBreakdowns,
    breakdownFor,
    simRain,
    simActive: simRain !== null,
    setSimRain,
    startSim,
    resetSim,
    routeOpen,
    routes,
    routeLoading,
    routeError,
    selectedRouteId,
    setSelectedRouteId,
    routeDestination,
    openRoute,
    closeRoute,
    findRoutes,
    reportOpen,
    reportZoneId,
    openReport,
    closeReport,
    userLocation,
    locate,
    locationDenied,
    lang,
    setLang,
    staleCount,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
