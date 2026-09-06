"use client";

import { useEffect, type ReactNode } from "react";

export type AddAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

/**
 * The only way food gets into the diary. It floats above the tab bar where the
 * thumb already is, and fans out into the ways to log, so the day itself can be
 * a plain list with no add button repeated down it.
 */
export function AddButton({
  actions,
  open,
  onOpenChange,
}: {
  actions: AddAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {/* Dimming the page is what makes the fan-out read as a menu rather than
          as buttons that appeared in the layout. */}
      {open && (
        <div
          // Above the tab bar (z-40), which would otherwise stay lit while
          // everything around it dimmed.
          className="animate-fade-in fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
          role="presentation"
        />
      )}

      <div
        className="pointer-events-none fixed inset-x-0 z-50 mx-auto flex max-w-2xl flex-col items-end gap-2.5 px-4 sm:px-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
      >
        {open &&
          actions.map((action, i) => (
            <button
              key={action.label}
              onClick={() => {
                onOpenChange(false);
                action.onClick();
              }}
              className="pressable pointer-events-auto flex items-center gap-3 pr-[0.375rem]"
              // Bottom-up, so the fan-out grows out of the button it came from.
              style={{
                animation: `fade-up var(--dur-base) var(--ease-out) ${
                  (actions.length - 1 - i) * 40
                }ms both`,
              }}
            >
              <span className="rounded-full bg-elevated px-3.5 py-1.5 text-sm font-semibold shadow-[var(--shadow-md)]">
                {action.label}
              </span>
              <span className="flex size-11 items-center justify-center rounded-full bg-elevated shadow-[var(--shadow-md)]">
                {action.icon}
              </span>
            </button>
          ))}

        <button
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-label={open ? "Close add menu" : "Add food"}
          className="pressable pointer-events-auto flex size-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-[var(--shadow-lg)]"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            aria-hidden="true"
            style={{
              transform: open ? "rotate(45deg)" : "none",
              transition: "transform var(--dur-base) var(--ease-spring)",
            }}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </>
  );
}
