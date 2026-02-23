import { NextResponse } from "next/server";

import { FIREBASE_DATABASE_URL } from "@/lib/firebase-config";
import { sendPasswordResetEmail, updateUserName } from "@/lib/firebase-auth-rest";
import { assertAdmin, getUidFromToken } from "@/lib/server/admin-auth";

function readToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function requireAdmin(request: Request) {
  const idToken = readToken(request);
  if (!idToken) return { error: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  const requesterUid = getUidFromToken(idToken);
  if (!requesterUid || !(await assertAdmin(idToken, requesterUid))) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { idToken, requesterUid };
}

export async function PATCH(request: Request, context: { params: Promise<{ uid: string }> }) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  const { uid } = await context.params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  await updateUserName(gate.idToken, uid, name);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, context: { params: Promise<{ uid: string }> }) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  const { uid } = await context.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "reset_password") {
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
    await sendPasswordResetEmail(email);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_user") {
    const confirmText = typeof body?.confirmText === "string" ? body.confirmText : "";
    if (confirmText !== "DELETE") {
      return NextResponse.json({ error: "Confirmation text must be DELETE" }, { status: 400 });
    }

    await fetch(`${FIREBASE_DATABASE_URL}/deletedUsers/${uid}.json?auth=${encodeURIComponent(gate.idToken)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deletedBy: gate.requesterUid,
        deletedAt: new Date().toISOString(),
      }),
    });

    await fetch(`${FIREBASE_DATABASE_URL}/users/${uid}.json?auth=${encodeURIComponent(gate.idToken)}`, {
      method: "DELETE",
    });
    return NextResponse.json({
      ok: true,
      warning: "Auth account deletion requires Firebase Admin SDK/service credentials. RTDB profile and access data were removed.",
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
