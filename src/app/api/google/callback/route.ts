import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleCalendarEnv } from "@/lib/google-calendar";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
};

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/settings", request.url);
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const savedState = request.cookies.get("google_oauth_state")?.value;

  if (error) {
    settingsUrl.searchParams.set("google_error", error);
    return redirectToSettings(settingsUrl);
  }

  if (!code || !state || !savedState || state !== savedState) {
    settingsUrl.searchParams.set("google_error", "Invalid Google Calendar connection request.");
    return redirectToSettings(settingsUrl);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { clientId, clientSecret } = getGoogleCalendarEnv();
  const redirectUri = new URL("/api/google/callback", request.url).toString();
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });
  const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenJson.access_token || !tokenJson.expires_in) {
    settingsUrl.searchParams.set("google_error", tokenJson.error_description || tokenJson.error || "Google Calendar did not connect.");
    return redirectToSettings(settingsUrl);
  }

  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` }
  });
  const userInfo = userInfoResponse.ok ? ((await userInfoResponse.json()) as GoogleUserInfo) : {};
  const expiresAt = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString();

  const { data: existingConnection } = await supabase
    .from("google_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle<{ refresh_token: string | null }>();

  const { error: upsertError } = await supabase.from("google_connections").upsert({
    user_id: user.id,
    google_email: userInfo.email ?? null,
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token ?? existingConnection?.refresh_token ?? null,
    expires_at: expiresAt,
    scope: tokenJson.scope ?? null,
    updated_at: new Date().toISOString()
  });

  if (upsertError) {
    settingsUrl.searchParams.set("google_error", upsertError.message);
    return redirectToSettings(settingsUrl);
  }

  settingsUrl.searchParams.set("google", "connected");
  return redirectToSettings(settingsUrl);
}

function redirectToSettings(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.delete("google_oauth_state");
  return response;
}
