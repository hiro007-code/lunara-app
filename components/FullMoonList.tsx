type FullMoonEntry = {
  date: string;
};

type FullMoonListProps = {
  entries?: FullMoonEntry[];
};

// Jahresübersicht (18 Monate) – echte Daten folgen in Etappe 4 (SPEC.md §2.2a).
export function FullMoonList({ entries = [] }: FullMoonListProps) {
  if (entries.length === 0) {
    return <p className="py-3 text-sm text-foreground-muted">Jahresübersicht folgt in Etappe 4.</p>;
  }

  return (
    <ul className="divide-y divide-white/10">
      {entries.map((entry) => (
        <li key={entry.date} className="py-3 text-foreground">
          {entry.date}
        </li>
      ))}
    </ul>
  );
}
