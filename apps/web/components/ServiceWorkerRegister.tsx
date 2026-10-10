"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (offline cache of the last-known zones). Only enabled in
 * production so it never interferes with `next dev` hot reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          // new SW waiting → prompt activation so stale caches are purged fast
          if (reg.waiting) {
            reg.update().catch(() => undefined);
          }
        })
        .catch(() => {
          // a failed registration must never break the app
        });
    };
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
