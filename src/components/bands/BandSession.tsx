"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { IdentityScreen } from "@/components/auth/IdentityScreen";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, selectApiBand, selectApiSet } from "@/lib/client-api";
import type { AppState } from "@/lib/types";

const emptyState: AppState = {
  authenticated: false,
  profile: null,
  suggestedDisplayName: "",
  bands: [],
  selectedBandId: null,
  people: [],
  joinRequests: [],
  bandCode: null,
  legacyOptions: [],
  songs: [],
  polls: [],
  setSongs: [],
  sets: [],
  selectedSetId: null,
  canManageSets: false,
};
type Session = {
  state: AppState;
  busy: boolean;
  refresh: () => Promise<void>;
  run: (action: () => Promise<void>) => Promise<boolean>;
};
const BandSessionContext = createContext<Session | null>(null);

export function useBandSession() {
  const session = useContext(BandSessionContext);
  if (!session) throw new Error("Band pages must be inside BandSession.");
  return session;
}

export function BandSession({ children }: { children: ReactNode }) {
  const params = useParams<{ bandId?: string; setId?: string }>();
  const bandId = params.bandId;
  const setId = params.setId;
  const routeKey = `${bandId ?? "bands"}:${setId ?? ""}`;
  const routeRef = useRef(routeKey);
  const requestId = useRef(0);
  const [state, setState] = useState(emptyState);
  const [loadedRoute, setLoadedRoute] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    selectApiBand(bandId ?? localStorage.getItem("song-active-band"));
    selectApiSet(setId ?? null);
    const next = await api<AppState>("/api/state");
    if (routeRef.current !== routeKey || request !== requestId.current) return;
    selectApiBand(bandId ?? next.selectedBandId);
    selectApiSet(next.selectedSetId);
    if (next.selectedBandId)
      localStorage.setItem("song-active-band", next.selectedBandId);
    else localStorage.removeItem("song-active-band");
    setState(next);
    setLoadedRoute(routeKey);
    setError("");
  }, [bandId, setId, routeKey]);

  useEffect(() => {
    let cancelled = false;
    routeRef.current = routeKey;
    selectApiSet(null);
    refresh().catch((error) => {
      if (!cancelled) {
        setError(
          error instanceof Error ? error.message : "Could not load your bands.",
        );
        setLoadedRoute(routeKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh, routeKey]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (
      await run(async () => {
        await api("/api/logout", { method: "POST" });
      })
    )
      router.replace("/bands");
  }

  if (loadedRoute !== routeKey)
    return (
      <main className="shell centered">
        <p className="loader" role="status">
          Loading your band room…
        </p>
      </main>
    );
  if (!state.authenticated && error)
    return (
      <main className="shell centered">
        <div className="stack">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => void run(async () => {})}>Try again</Button>
        </div>
      </main>
    );
  if (!state.authenticated) return <LoginScreen onAuthenticated={refresh} />;
  if (!state.profile)
    return (
      <IdentityScreen
        suggestedName={state.suggestedDisplayName}
        onComplete={refresh}
        onLogout={logout}
      />
    );

  return (
    <BandSessionContext.Provider value={{ state, busy, refresh, run }}>
      <div className="shell">
        <AppHeader
          memberName={state.profile.display_name}
          busy={busy}
          onLogout={logout}
        >
          <Button asChild variant="ghost" size="sm">
            <Link href="/bands">All bands</Link>
          </Button>
        </AppHeader>
        <main className="page-content bands-page">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {children}
        </main>
      </div>
    </BandSessionContext.Provider>
  );
}
