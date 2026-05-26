import Link from "next/link";
import { CalendarDays, Home, Mail, Trash2, UserRound } from "lucide-react";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { addHouseholdMember, disconnectGoogleCalendar, removeHouseholdMember, renameHousehold } from "./actions";

type HouseholdMember = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: "owner" | "member";
  joined_at: string;
};

type GoogleConnection = {
  google_email: string | null;
  updated_at: string;
};

type SettingsPageProps = {
  searchParams: Promise<{ google?: string; google_error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);

  const { data: members, error } = await supabase
    .rpc("get_household_members", { target_household_id: household.id })
    .returns<HouseholdMember[]>();

  if (error) {
    throw new Error(error.message);
  }

  const memberRows = (members ?? []) as HouseholdMember[];
  const currentMember = memberRows.find((member) => member.user_id === user.id);
  const isOwner = currentMember?.role === "owner";
  const { data: googleConnection } = await supabase
    .from("google_connections")
    .select("google_email, updated_at")
    .eq("user_id", user.id)
    .maybeSingle<GoogleConnection>();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-sage">{household.name}</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/65">Manage your household name, members, and connected services.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-5">
          <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Home className="h-5 w-5 text-sage" />
              <h2 className="text-lg font-semibold text-ink">Household</h2>
            </div>
            <form action={renameHousehold} className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium uppercase text-ink/50">Household name</span>
                <input
                  required
                  disabled={!isOwner}
                  name="name"
                  defaultValue={household.name}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage disabled:bg-paper disabled:text-ink/50"
                />
              </label>
              <button
                disabled={!isOwner}
                className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save name
              </button>
              {!isOwner ? <p className="text-sm text-ink/55">Only household owners can rename the household.</p> : null}
            </form>
          </div>

          <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue" />
              <h2 className="text-lg font-semibold text-ink">Google Calendar</h2>
            </div>
            {params.google === "connected" ? (
              <p className="mb-3 rounded-md border border-sage/30 bg-sage/10 px-3 py-2 text-sm text-sage">
                Google Calendar is connected.
              </p>
            ) : null}
            {params.google_error ? (
              <p className="mb-3 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
                {params.google_error}
              </p>
            ) : null}
            {googleConnection ? (
              <div className="space-y-3">
                <div className="rounded-md border border-line bg-paper px-3 py-2 text-sm">
                  <p className="font-medium text-ink">{googleConnection.google_email || "Google Calendar connected"}</p>
                  <p className="mt-1 text-xs text-ink/55">Tasks can create reminder events on this calendar.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/api/google/connect"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-paper"
                  >
                    Reconnect
                  </Link>
                  <form action={disconnectGoogleCalendar}>
                    <button className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-coral hover:bg-coral/10">
                      Disconnect
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink/60">
                  Connect your personal Google Calendar to create reminder events from scheduled Home Hub tasks.
                </p>
                <Link
                  href="/api/google/connect"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90"
                >
                  Connect Google Calendar
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue" />
              <h2 className="text-lg font-semibold text-ink">Add member</h2>
            </div>
            <form action={addHouseholdMember} className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium uppercase text-ink/50">Member email</span>
                <input
                  required
                  disabled={!isOwner}
                  name="email"
                  type="email"
                  placeholder="partner@example.com"
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage disabled:bg-paper disabled:text-ink/50"
                />
              </label>
              <button
                disabled={!isOwner}
                className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add member
              </button>
              <p className="text-sm text-ink/55">The person must already have signed up before they can be added.</p>
            </form>
          </div>

          <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold text-ink">Your account</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ink/55">Email</span>
                <span className="truncate font-medium text-ink">{user.email}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink/55">Role</span>
                <span className="font-medium capitalize text-ink">{currentMember?.role ?? "member"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Household members</h2>
            <span className="text-sm text-ink/55">{memberRows.length}</span>
          </div>

          {memberRows.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">
              No members found yet.
            </p>
          ) : (
            <div className="space-y-2">
              {memberRows.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{member.full_name || member.email || "Household member"}</p>
                    <p className="mt-1 truncate text-xs text-ink/50">
                      {[member.email, member.role, `Joined ${formatDate(member.joined_at)}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {isOwner && member.role !== "owner" ? (
                    <form action={removeHouseholdMember}>
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <button
                        className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral"
                        aria-label={`Remove ${member.email ?? "member"}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <span className="rounded-full border border-line bg-paper px-2 py-1 text-xs font-medium capitalize text-ink/60">
                      {member.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
