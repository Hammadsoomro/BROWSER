export default function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs uppercase tracking-wide text-foreground/60">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}
