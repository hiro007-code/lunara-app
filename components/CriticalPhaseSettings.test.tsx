// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CriticalPhaseProvider } from "./CriticalPhaseProvider";
import { CriticalPhaseSettings } from "./CriticalPhaseSettings";

function renderSettings() {
  return render(
    <CriticalPhaseProvider>
      <CriticalPhaseSettings />
    </CriticalPhaseProvider>,
  );
}

describe("CriticalPhaseSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("zeigt zusammengeklappt eine Zeile mit dem Default-Text (inkl. 'Vollmond')", () => {
    renderSettings();
    const toggle = screen.getByRole("button", { name: "Kritische Phase: 7 Tage vorher – Vollmond" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("aktualisiert den Anzeige-Text sofort, wenn ein Select geändert wird (inkl. '1 Tag nachher')", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /Kritische Phase:/ }));

    fireEvent.change(screen.getByLabelText("Ende der kritischen Phase"), { target: { value: "1" } });

    expect(screen.getByRole("button", { name: "Kritische Phase: 7 Tage vorher – 1 Tag nachher" })).toBeTruthy();
  });

  it("klappt bei Klick auf und wieder zu, ohne die persistierte Phasen-Einstellung zu verändern", () => {
    renderSettings();
    const toggle = screen.getByRole("button", { name: /Kritische Phase:/ });

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    // Reines Auf-/Zuklappen schreibt nie in localStorage – nur setStartOffset/setEndOffset tun das.
    expect(localStorage.getItem("lunara:critical-phase")).toBeNull();
    expect(screen.getByRole("button", { name: "Kritische Phase: 7 Tage vorher – Vollmond" })).toBeTruthy();
  });
});
