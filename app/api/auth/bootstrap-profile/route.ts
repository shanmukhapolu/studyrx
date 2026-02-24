import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { touchUserLogin, updateDisplayName } from "@/lib/firebase-auth-rest";
import { getUidFromToken } from "@/lib/server/admin-auth";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cookieToken = (await cookies()).get("studyrx_auth_token")?.value || null;
  const idToken = bearerToken || cookieToken;
  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const uid = getUidFromToken(idToken);
  if (!uid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const preferredName = [firstName, lastName].filter(Boolean).join(" ") || displayName;

  if (preferredName) {
    try {
      await updateDisplayName(idToken, preferredName, uid);
    } catch {
      // Display name update is optional; profile bootstrap still proceeds.
    }
  }

  const profile = await touchUserLogin(idToken, uid, {
    email,
    fallbackName: preferredName,
  });

  return NextResponse.json({ profile });
}
