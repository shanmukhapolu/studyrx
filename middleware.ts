import { NextResponse, type NextRequest } from "next/server";

import { assertAdmin } from "@/lib/server/admin-auth";

const SIGN_IN_PATH = "/auth/signin";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const idToken = req.cookies.get("studyrx_auth_token")?.value;
  const uid = req.cookies.get("studyrx_auth_uid")?.value;

  if (!idToken) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = SIGN_IN_PATH;
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const allowed = await assertAdmin(idToken, uid);
  if (allowed) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dashboard = req.nextUrl.clone();
  dashboard.pathname = "/dashboard";
  dashboard.search = "";
  return NextResponse.redirect(dashboard);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
