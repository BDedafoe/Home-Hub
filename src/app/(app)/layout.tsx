import { redirect } from "next/navigation";
import { DesktopNav, MobileBottomNav } from "@/components/app-nav";
import { QuickAdd } from "@/components/quick-add";
import { getOrCreateHousehold } from "@/lib/households";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const household = await getOrCreateHousehold(user);

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-panel px-4 py-5 md:block">
        <div className="px-2">
          <p className="text-sm font-medium text-sage">Home Hub</p>
          <h1 className="mt-1 text-xl font-semibold text-ink">{household.name}</h1>
        </div>
        <DesktopNav />
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur md:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Private household</p>
            <p className="truncate text-sm font-medium text-ink">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <QuickAdd />
            <form action={signOut}>
              <button className="hidden rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink hover:border-ink/40 sm:inline-flex">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 pb-28 pt-6 md:px-8 md:pb-8">{children}</main>
      </div>
      <MobileBottomNav signOutAction={signOut} />
    </div>
  );
}
