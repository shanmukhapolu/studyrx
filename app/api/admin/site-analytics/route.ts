import { NextResponse } from "next/server";

import { getSiteAnalytics } from "@/lib/server/admin-site-analytics";
import { assertAdmin, getUidFromToken } from "@/lib/server/admin-auth";

function readToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function GET(request: Request) {
  const idToken = readToken(request);
  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const requesterUid = getUidFromToken(idToken);
  if (!requesterUid || !(await assertAdmin(idToken, requesterUid))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  const analytics = await getSiteAnalytics(idToken, { forceRefresh });
  return NextResponse.json({ analytics });
}
