import { NextResponse } from "next/server";

import { setUserRole } from "@/lib/firebase-auth-rest";
import { assertAdmin, getUidFromToken } from "@/lib/server/admin-auth";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const requesterUid = getUidFromToken(idToken);
  if (!requesterUid || !(await assertAdmin(idToken, requesterUid))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetUid = typeof body?.uid === "string" ? body.uid.trim() : "";

  if (!targetUid) {
    return NextResponse.json({ error: "Missing target uid" }, { status: 400 });
  }

  await setUserRole(idToken, targetUid, "admin");

  return NextResponse.json({ uid: targetUid, role: "admin" });
}
