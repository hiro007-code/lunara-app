type TimezonePickerProps = {
  value?: string;
};

// Zeitzonen-Auswahl (durchsuchbar, Favoriten) – echte Logik folgt in Etappe 5 (SPEC.md §2.3).
export function TimezonePicker({ value = "Europe/Zurich" }: TimezonePickerProps) {
  return (
    <button type="button" className="text-sm text-foreground-muted">
      {value}
    </button>
  );
}
