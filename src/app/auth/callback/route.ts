import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  let safeNext = "/";

  if (next && URL.canParse(next, request.url)) {
    const destination = new URL(next, request.url);
    if (destination.origin === request.nextUrl.origin) {
      safeNext = `${destination.pathname}${destination.search}${destination.hash}`;
    }
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Could%20not%20verify%20the%20email%20link", request.url),
  );
}
