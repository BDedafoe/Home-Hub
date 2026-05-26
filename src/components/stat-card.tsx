type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-ink/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink/55">{detail}</p>
    </section>
  );
}
