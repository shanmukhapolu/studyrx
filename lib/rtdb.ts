import { FIREBASE_DATABASE_URL } from "@/lib/firebase-config";
import { refreshIdToken } from "@/lib/firebase-auth-rest";

export type StoredAuthSession = {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt?: number;
  user: {
    uid: string;
    email?: string;
    displayName?: string;
  };
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveUidFromToken(idToken: string): string {
  const payload = decodeJwtPayload(idToken);
  const uid = (payload?.user_id || payload?.sub) as string | undefined;
  return typeof uid === "string" ? uid : "";
}

function readStoredAuth(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("studyrx_auth_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export async function getStoredAuth(options?: { forceRefresh?: boolean }): Promise<StoredAuthSession | null> {
  const session = readStoredAuth();
  if (!session) return null;

  let current = session;

  if ((!current.user?.uid || current.user.uid.length === 0) && current.idToken) {
    const decodedUid = resolveUidFromToken(current.idToken);
    if (decodedUid) {
      current = {
        ...current,
        user: {
          ...current.user,
          uid: decodedUid,
        },
      };
      localStorage.setItem("studyrx_auth_session", JSON.stringify(current));
    }
  }

  const expiresAt = current.expiresAt ?? 0;
  const missingUid = !current.user?.uid || current.user.uid.length === 0;
  const shouldRefresh = Boolean(current.refreshToken) && (missingUid || options?.forceRefresh || (expiresAt > 0 && expiresAt <= Date.now() + 30_000));
  if (shouldRefresh) {
    try {
      const refreshed = await refreshIdToken(current.refreshToken);
      current = {
        ...current,
        idToken: refreshed.idToken,
        refreshToken: refreshed.refreshToken,
        expiresIn: refreshed.expiresIn,
        expiresAt: Date.now() + refreshed.expiresIn * 1000,
        user: {
          ...current.user,
          uid: refreshed.uid || current.user.uid || resolveUidFromToken(refreshed.idToken),
        },
      };
      localStorage.setItem("studyrx_auth_session", JSON.stringify(current));
    } catch {
      return current;
    }
  }

  return current;
}

async function authedUrl(path: string, options?: { forceRefresh?: boolean }) {
  const auth = await getStoredAuth(options);
  if (!auth?.idToken) {
    throw new Error("Not authenticated");
  }

  return {
    idToken: auth.idToken,
    url: `${FIREBASE_DATABASE_URL}/${path}.json?auth=${encodeURIComponent(auth.idToken)}`,
  };
}

export async function rtdbGet<T>(path: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;
  try {
    let request = await authedUrl(path);
    let res = await fetch(request.url, {
      headers: {
        Authorization: `Bearer ${request.idToken}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      request = await authedUrl(path, { forceRefresh: true });
      res = await fetch(request.url, {
        headers: {
          Authorization: `Bearer ${request.idToken}`,
        },
      });
    }

    if (!res.ok) return fallback;
    const data = await res.json();
    return (data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function rtdbSet(path: string, value: unknown) {
  let request = await authedUrl(path);
  let res = await fetch(request.url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.idToken}`,
    },
    body: JSON.stringify(value),
  });

  if (res.status === 401 || res.status === 403) {
    request = await authedUrl(path, { forceRefresh: true });
    res = await fetch(request.url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.idToken}`,
      },
      body: JSON.stringify(value),
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to write ${path}: ${res.status} ${text}`);
  }
}

export async function rtdbPatch(path: string, value: Record<string, unknown>) {
  let request = await authedUrl(path);
  let res = await fetch(request.url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.idToken}`,
    },
    body: JSON.stringify(value),
  });

  if (res.status === 401 || res.status === 403) {
    request = await authedUrl(path, { forceRefresh: true });
    res = await fetch(request.url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.idToken}`,
      },
      body: JSON.stringify(value),
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to patch ${path}: ${res.status} ${text}`);
  }
}

export async function rtdbPost(path: string, value: Record<string, unknown>) {
  let request = await authedUrl(path);
  let res = await fetch(request.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.idToken}`,
    },
    body: JSON.stringify(value),
  });

  if (res.status === 401 || res.status === 403) {
    request = await authedUrl(path, { forceRefresh: true });
    res = await fetch(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.idToken}`,
      },
      body: JSON.stringify(value),
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to push ${path}: ${res.status} ${text}`);
  }

  return (await res.json()) as { name: string };
}
