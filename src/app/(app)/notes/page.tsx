import { Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { addNote, deleteNote, toggleNotePinned } from "./actions";

type Note = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  pinned: boolean;
  created_at: string;
};

const categories = ["General", "Date idea", "Gift idea", "Trip", "House project", "To discuss"];

export default async function NotesPage() {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);

  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, body, category, pinned, created_at")
    .eq("household_id", household.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Note[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rows = notes ?? [];
  const pinnedNotes = rows.filter((note) => note.pinned);
  const regularNotes = rows.filter((note) => !note.pinned);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-sage">{household.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Notes</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Capture loose thoughts, plans, gift ideas, house projects, and things to discuss.
          </p>
        </div>
        <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink/70">
          {pinnedNotes.length} pinned
        </div>
      </div>

      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
        <form action={addNote} className="grid gap-3 lg:grid-cols-[1fr_0.7fr_auto]">
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Title</span>
            <input
              required
              name="title"
              placeholder="Talk about fall trip"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Category</span>
            <select
              name="category"
              defaultValue="General"
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm font-medium text-ink">
            <input name="pinned" type="checkbox" className="h-4 w-4 accent-sage" />
            Pin
          </label>
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium uppercase text-ink/50">Body</span>
            <textarea
              name="body"
              rows={3}
              placeholder="A little more context, if useful"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <button className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <NoteSection title="Pinned" notes={pinnedNotes} empty="Pinned notes will show here." />
        <NoteSection title="All notes" notes={regularNotes} empty="No unpinned notes yet." />
      </div>
    </div>
  );
}

function NoteSection({ title, notes, empty }: { title: string; notes: Note[]; empty: string }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <span className="text-sm text-ink/55">{notes.length}</span>
      </div>
      {notes.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">{empty}</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="rounded-md border border-line p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink">{note.title}</h3>
                    <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs font-medium text-ink/60">
                      {note.category ?? "General"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink/45">{formatDate(note.created_at)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <form action={toggleNotePinned}>
                    <input type="hidden" name="id" value={note.id} />
                    <input type="hidden" name="pinned" value={String(!note.pinned)} />
                    <button
                      className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-sage"
                      aria-label={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
                    >
                      {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                  </form>
                  <form action={deleteNote}>
                    <input type="hidden" name="id" value={note.id} />
                    <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral" aria-label={`Delete ${note.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
              {note.body ? <p className="mt-3 whitespace-pre-wrap text-sm text-ink/70">{note.body}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
