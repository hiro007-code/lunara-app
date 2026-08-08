"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

type SheetProps = {
  title: string;
  onClose: () => void;
  /** Element, das beim Öffnen fokussiert wird. Standard: der Schliessen-Button. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

const FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

/**
 * Ruhiges Bottom-Sheet im bestehenden Design (§5): Backdrop, Fokus-Falle, Fokus-Restore.
 * Schliessen per X, Hintergrund-Tap oder Escape. Gemeinsame Basis für TimezonePicker
 * und AboutSheet, damit diese nicht-triviale Logik nur an einer Stelle lebt.
 */
export function Sheet({ title, onClose, initialFocusRef, children }: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Muss vor dem fokus-verschiebenden Effekt erfasst werden (lazy useState-Initializer
  // läuft während des ersten Renders, also bevor der Effekt den Fokus verschiebt).
  const [previouslyFocused] = useState<HTMLElement | null>(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    (initialFocusRef?.current ?? closeButtonRef.current)?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previouslyFocused]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border-t border-white/10 bg-background p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-sm text-foreground-muted">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Schliessen"
            className="focus-ring text-foreground-muted"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
