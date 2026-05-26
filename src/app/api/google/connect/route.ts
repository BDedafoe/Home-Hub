import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleCalendarEnv, hasGoogleCalendarEnv } from "@/lib/google-calendar";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email"
];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!hasGoogleCalendarEnv()) {
    const settingsUrl = new URL("/settings", request.url);
    settingsUrl.searchParams.set("google_error", "Google Calendar setup is missing the Google Client ID or Client Secret.");
    return NextResponse.redirect(settingsUrl);
  }

  const { clientId } = getGoogleCalendarEnv();
  const state = randomBytes(24).toString("hex");
  const redirectUri = new URL("/api/google/callback", request.url).toString();
  const authUrl = new URL(GOOGLE_AUTH_URL);

  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state
  }).toString();

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 10 * 60,
    path: "/"
  });

  return response;
}
