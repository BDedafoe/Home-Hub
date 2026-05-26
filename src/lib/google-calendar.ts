import type { SupabaseClient } from "@supabase/supabase-js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

type GoogleConnection = {
  user_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scope: string | null;
};

type CalendarTask = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  google_calendar_event_id: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GoogleEventResponse = {
  id?: string;
  htmlLink?: string;
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{
      reason?: string;
      message?: string;
    }>;
    status?: string;
  };
};

export function getGoogleCalendarEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const timeZone = process.env.GOOGLE_CALENDAR_TIME_ZONE || "America/Chicago";

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google Calendar environment variables.");
  }

  return { clientId, clientSecret, timeZone };
}

export function hasGoogleCalendarEnv() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function getValidGoogleAccessToken(supabase: SupabaseClient, userId: string) {
  const { data: connection, error } = await supabase
    .from("google_connections")
    .select("user_id, google_email, access_token, refresh_token, expires_at, scope")
    .eq("user_id", userId)
    .maybeSingle<GoogleConnection>();

  if (error) {
    throw new Error(error.message);
  }

  if (!connection) {
    throw new Error("Connect Google Calendar in Settings before adding reminders.");
  }

  const expiresAt = new Date(connection.expires_at).getTime();
  const refreshAt = Date.now() + 60_000;

  if (expiresAt > refreshAt) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Reconnect Google Calendar in Settings to refresh access.");
  }

  const { clientId, clientSecret } = getGoogleCalendarEnv();
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token"
    })
  });

  const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenJson.access_token || !tokenJson.expires_in) {
    throw new Error(tokenJson.error_description || tokenJson.error || "Could not refresh Google Calendar access.");
  }

  const nextExpiresAt = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("google_connections")
    .update({
      access_token: tokenJson.access_token,
      expires_at: nextExpiresAt,
      scope: tokenJson.scope ?? connection.scope,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return tokenJson.access_token;
}

export async function syncTaskToGoogleCalendar(supabase: SupabaseClient, userId: string, taskId: string, reminderMinutes: number) {
  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, due_time, google_calendar_event_id")
    .eq("id", taskId)
    .single<CalendarTask>();

  if (error) {
    throw new Error(error.message);
  }

  if (!task.due_date || !task.due_time) {
    throw new Error("Add a due date and time before creating a Google Calendar reminder.");
  }

  const accessToken = await getValidGoogleAccessToken(supabase, userId);
  const { timeZone } = getGoogleCalendarEnv();
  const startTime = normalizeTime(task.due_time);
  const end = addMinutes(task.due_date, startTime, 30);
  const event = {
    summary: task.title,
    description: task.description || "Created from Home Hub.",
    start: {
      dateTime: `${task.due_date}T${startTime}:00`,
      timeZone
    },
    end: {
      dateTime: `${end.date}T${end.time}:00`,
      timeZone
    },
    reminders: {
      useDefault: false,
      overrides: reminderMinutes > 0 ? [{ method: "popup", minutes: reminderMinutes }] : []
    }
  };

  const eventUrl = task.google_calendar_event_id
    ? `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(task.google_calendar_event_id)}`
    : `${GOOGLE_CALENDAR_API}/calendars/primary/events`;

  const response = await fetch(eventUrl, {
    method: task.google_calendar_event_id ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event)
  });

  const calendarEvent = (await response.json()) as GoogleEventResponse;

  if (!response.ok || !calendarEvent.id) {
    const googleMessage = [
      calendarEvent.error?.message,
      calendarEvent.error?.errors?.map((detail) => detail.reason || detail.message).filter(Boolean).join(", ")
    ]
      .filter(Boolean)
      .join(" ");

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        googleMessage
          ? `Google Calendar rejected the reminder (${response.status}): ${googleMessage}`
          : "Google Calendar needs permission to create events. Disconnect and reconnect Google Calendar in Settings."
      );
    }

    throw new Error(googleMessage || "Could not create the Google Calendar reminder.");
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      reminder_minutes: reminderMinutes,
      google_calendar_event_id: calendarEvent.id,
      google_calendar_html_link: calendarEvent.htmlLink ?? null,
      google_calendar_synced_at: new Date().toISOString()
    })
    .eq("id", task.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

function addMinutes(dateValue: string, timeValue: string, minutesToAdd: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute + minutesToAdd));

  return {
    date: [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0")
    ].join("-"),
    time: [String(date.getUTCHours()).padStart(2, "0"), String(date.getUTCMinutes()).padStart(2, "0")].join(":")
  };
}
