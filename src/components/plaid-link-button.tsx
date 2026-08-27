"use client";

import { useState } from "react";
import { CreditCard, RefreshCw } from "lucide-react";

declare global {
  interface Window {
    Plaid?: {
      create: (config: PlaidCreateConfig) => { open: () => void };
    };
  }
}

type PlaidCreateConfig = {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidSuccessMetadata) => void;
  onExit?: (error: unknown) => void;
};

type PlaidSuccessMetadata = {
  institution?: {
    name?: string;
  };
};

export function PlaidLinkButton() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function connect() {
    setLoading(true);
    setMessage(null);

    try {
      await loadPlaidScript();
      const tokenResponse = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const tokenPayload = await readJsonResponse<{ link_token?: string; error?: string }>(tokenResponse);

      if (!tokenResponse.ok) {
        throw new Error(tokenPayload?.error ?? "Could not start Plaid Link.");
      }

      if (!tokenPayload?.link_token) {
        throw new Error("Plaid did not return a link token.");
      }

      const plaid = window.Plaid?.create({
        token: tokenPayload.link_token,
        onSuccess: async (publicToken, metadata) => {
          try {
            setMessage("Syncing transactions...");
            const exchangeResponse = await fetch("/api/plaid/exchange-public-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                public_token: publicToken,
                institution_name: metadata.institution?.name ?? null
              })
            });
            const exchangePayload = await readJsonResponse<{ error?: string }>(exchangeResponse);

            if (!exchangeResponse.ok) {
              throw new Error(exchangePayload?.error ?? "Could not connect account.");
            }

            setMessage("Connected. Refreshing Money...");
            window.location.reload();
          } catch (error) {
            setLoading(false);
            setMessage(error instanceof Error ? error.message : "Could not connect account.");
          }
        },
        onExit: () => {
          setLoading(false);
        }
      });

      plaid?.open();
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : "Plaid connection failed.");
    }
  }

  async function syncNow() {
    setSyncing(true);
    setMessage(null);

    try {
      const syncResponse = await fetch("/api/plaid/sync", { method: "POST" });
      const syncPayload = await readJsonResponse<{ results?: PlaidSyncResult[]; error?: string }>(syncResponse);

      if (!syncResponse.ok) {
        throw new Error(syncPayload?.error ?? "Could not sync transactions.");
      }

      const totals = getSyncTotals(syncPayload?.results ?? []);
      setMessage(`Synced ${totals.changed} transaction${totals.changed === 1 ? "" : "s"}. Refreshing Money...`);
      window.location.reload();
    } catch (error) {
      setSyncing(false);
      setMessage(error instanceof Error ? error.message : "Could not sync transactions.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={connect}
          disabled={loading || syncing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CreditCard className="h-4 w-4" />
          {loading ? "Connecting..." : "Connect Credit Card"}
        </button>
        <button
          type="button"
          onClick={syncNow}
          disabled={loading || syncing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync transactions now"}
        </button>
      </div>
      {message ? <p className="text-xs text-ink/55">{message}</p> : null}
    </div>
  );
}

function loadPlaidScript() {
  if (window.Plaid) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[src='https://cdn.plaid.com/link/v2/stable/link-initialize.js']");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Could not load Plaid Link.")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Plaid Link."));
    document.body.appendChild(script);
  });
}

async function readJsonResponse<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text.slice(0, 180) } as T;
  }
}

type PlaidSyncResult =
  | {
      ok: true;
      added: number;
      modified: number;
      removed: number;
    }
  | {
      ok: false;
      error: string;
    };

function getSyncTotals(results: PlaidSyncResult[]) {
  return results.reduce(
    (totals, result) => {
      if (result.ok) {
        totals.changed += result.added + result.modified + result.removed;
      } else {
        totals.failed += 1;
      }

      return totals;
    },
    { changed: 0, failed: 0 }
  );
}
