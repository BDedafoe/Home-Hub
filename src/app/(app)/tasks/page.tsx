import Link from "next/link";
import { CalendarClock, ExternalLink, Plus, Trash2 } from "lucide-react";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { addTask, createCalendarReminder, deleteTask, toggleTask } from "./actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high";
  status: "open" | "done" | "archived";
  due_date: string | null;
  due_time: string | null;
  reminder_minutes: number;
  google_calendar_event_id: string | null;
  google_calendar_html_link: string | null;
  google_calendar_synced_at: string | null;
  created_at: string;
};

type GoogleConnection = {
  user_id: string;
};

const priorityStyles = {
  low: "border-blue/20 bg-blue/10 text-blue",
  normal: "border-line bg-paper text-ink/65",
  high: "border-coral/30 bg-coral/10 text-coral"
};

type TasksPageProps = {
  searchParams: Promise<{ calendar?: string; calendar_error?: string }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id, title, description, priority, status, due_date, due_time, reminder_minutes, google_calendar_event_id, google_calendar_html_link, google_calendar_synced_at, created_at"
    )
    .eq("household_id", household.id)
    .neq("status", "archived")
    .order("status", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<Task[]>();

  if (error) {
    throw new Error(error.message);
  }

  const { data: googleConnection } = await supabase
    .from("google_connections")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle<GoogleConnection>();

  const openTasks = tasks?.filter((task) => task.status === "open") ?? [];
  const doneTasks = tasks?.filter((task) => task.status === "done") ?? [];
  const dueTodayCount = openTasks.filter((task) => task.due_date === todayIsoDate()).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-sage">{household.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Tasks</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Track shared chores, errands, bill reminders, and household follow-ups.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink/70">
            {openTasks.length} open
          </div>
          <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink/70">
            {dueTodayCount} due today
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
        {params.calendar === "added" ? (
          <p className="mb-4 rounded-md border border-sage/30 bg-sage/10 px-3 py-2 text-sm text-sage">
            Google Calendar reminder added.
          </p>
        ) : null}
        {params.calendar_error ? (
          <p className="mb-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {params.calendar_error}
          </p>
        ) : null}
        <form action={addTask} className="grid gap-3 lg:grid-cols-[1.1fr_1fr_0.65fr_0.55fr_0.7fr_0.55fr_auto]">
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Task</span>
            <input
              required
              name="title"
              placeholder="Change air filter"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Details</span>
            <input
              name="description"
              placeholder="Optional note"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Due date</span>
            <input
              name="due_date"
              type="date"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Time</span>
            <input
              name="due_time"
              type="time"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Reminder</span>
            <select
              name="reminder_minutes"
              defaultValue="30"
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
            >
              <option value="0">At time</option>
              <option value="10">10 min</option>
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="1440">1 day</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Priority</span>
            <select
              name="priority"
              defaultValue="normal"
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <TaskList title="Open tasks" tasks={openTasks} googleConnected={Boolean(googleConnection)} />
        <TaskList title="Done" tasks={doneTasks} googleConnected={Boolean(googleConnection)} doneList />
      </div>
    </div>
  );
}

function TaskList({
  title,
  tasks,
  googleConnected,
  doneList = false
}: {
  title: string;
  tasks: Task[];
  googleConnected: boolean;
  doneList?: boolean;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <span className="text-sm text-ink/55">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-line p-6 text-center">
          <p className="text-sm font-medium text-ink">{doneList ? "Nothing completed yet" : "No open tasks"}</p>
          <p className="mt-1 text-sm text-ink/55">
            {doneList ? "Finished tasks will collect here." : "Add a task above when something needs doing."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex flex-col gap-3 rounded-md border border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <form action={toggleTask} className="flex min-w-0 flex-1 items-center gap-3">
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="status" value={task.status === "done" ? "open" : "done"} />
                <button
                  className="h-4 w-4 shrink-0 rounded border border-line bg-panel ring-offset-2 hover:border-sage focus:outline-none focus:ring-2 focus:ring-sage"
                  aria-label={task.status === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`}
                >
                  {task.status === "done" ? <span className="block h-full w-full rounded-sm bg-sage" /> : null}
                </button>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p
                      className={
                        task.status === "done"
                          ? "truncate text-sm font-medium text-ink/45 line-through"
                          : "truncate text-sm font-medium text-ink"
                      }
                    >
                      {task.title}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityStyles[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink/50">
                    {[
                      task.description,
                      task.due_date ? `Due ${formatDate(task.due_date)}${task.due_time ? ` at ${formatTime(task.due_time)}` : ""}` : null,
                      task.google_calendar_synced_at ? "Google reminder added" : null
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No details"}
                  </p>
                </div>
              </form>
              <div className="flex shrink-0 flex-wrap items-center gap-2 pl-7 sm:pl-0">
                {task.status === "open" ? (
                  googleConnected ? (
                    task.due_date && task.due_time ? (
                      <form action={createCalendarReminder} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={task.id} />
                        <select
                          name="reminder_minutes"
                          defaultValue={String(task.reminder_minutes ?? 30)}
                          className="h-9 rounded-md border border-line bg-panel px-2 text-xs outline-none focus:border-sage"
                          aria-label={`Reminder timing for ${task.title}`}
                        >
                          <option value="0">At time</option>
                          <option value="10">10 min</option>
                          <option value="30">30 min</option>
                          <option value="60">1 hour</option>
                          <option value="1440">1 day</option>
                        </select>
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-paper"
                          aria-label={`${task.google_calendar_event_id ? "Update" : "Add"} Google Calendar reminder for ${task.title}`}
                        >
                          <CalendarClock className="h-4 w-4" />
                          {task.google_calendar_event_id ? "Update" : "Remind"}
                        </button>
                      </form>
                    ) : (
                      <span className="rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink/55">Needs date and time</span>
                    )
                  ) : (
                    <Link href="/settings" className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-paper">
                      Connect calendar
                    </Link>
                  )
                ) : null}
                {task.google_calendar_html_link ? (
                  <Link
                    href={task.google_calendar_html_link}
                    target="_blank"
                    className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-blue"
                    aria-label={`Open Google Calendar event for ${task.title}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ) : null}
                <form action={deleteTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral" aria-label={`Delete ${task.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":");
  const date = new Date(`2020-01-01T${hour}:${minute}:00`);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}
