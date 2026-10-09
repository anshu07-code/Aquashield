"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "success" | "error" | "info";
export type Toast = { id: number; kind: ToastKind; title: string; sub?: string };

type ToastApi = {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, sub?: string) => void;
  error: (title: string, sub?: string) => void;
  info: (title: string, sub?: string) => void;
};

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastKind, string> = {
  success: "M20 6 9 17l-5-5",
  error: "M18 6 6 18M6 6l12 12",
  info: "M12 16v-4M12 8h.01",
};

const STYLES: Record<ToastKind, string> = {
  success: "border-emerald-400/30 text-emerald-300",
  error: "border-rose-400/30 text-rose-300",
  info: "border-sky-400/30 text-sky-300",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { ...t, id }]);
    },
    [],
  );

  const api: ToastApi = {
    toast,
    success: (title, sub) => toast({ kind: "success", title, sub }),
    error: (title, sub) => toast({ kind: "error", title, sub }),
    info: (title, sub) => toast({ kind: "info", title, sub }),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex flex-col items-center gap-2 px-4 sm:top-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const ms = toast.kind === "error" ? 6000 : 3800;
    const t = setTimeout(onClose, ms);
    return () => clearTimeout(t);
  }, [toast.kind, onClose]);

  return (
    <div
      className={`glass-strong pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-2xl border ${STYLES[toast.kind]} px-4 py-3 shadow-glow`}
      role="status"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-5 w-5 shrink-0"
      >
        <path d={ICONS[toast.kind]} />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        {toast.sub ? <p className="mt-0.5 text-xs text-white/60">{toast.sub}</p> : null}
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="-mr-1 rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
