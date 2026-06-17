type ModulePageProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function ModulePage({ title, description, children }: ModulePageProps) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">{description}</p>
        </div>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-paper hover:bg-primary/90">
          Quick add
        </button>
      </div>
      {children ?? (
        <section className="rounded-lg border border-dashed border-line bg-panel p-8 text-center">
          <p className="text-sm font-medium text-ink">No items yet</p>
          <p className="mt-1 text-sm text-ink/60">This module is ready for its first database-backed feature.</p>
        </section>
      )}
    </div>
  );
}
