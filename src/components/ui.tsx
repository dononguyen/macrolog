"use client";

import type { ReactNode } from "react";

/**
 * The handful of shapes every screen repeats. Keeping them here means a
 * padding, radius or motion change happens once rather than in nine files.
 */

export function Card({
  title,
  action,
  children,
  className = "",
  lift = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Cards that behave like a target lift on hover; static panels do not. */
  lift?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-sm)] ${
        lift ? "liftable" : ""
      } ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
          {title && <h2 className="tight font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-border bg-sunken px-4 py-3 text-base outline-none placeholder:text-faint transition-[border-color,background-color,box-shadow] duration-150 focus:border-accent focus:bg-surface focus:shadow-[var(--shadow-sm)]";

export function TextInput(
  props: React.ComponentPropsWithRef<"input"> & { numeric?: boolean },
) {
  const { numeric, className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`${inputClass} ${numeric ? "tabular" : ""} ${className}`}
    />
  );
}

export function NumberInput(
  props: React.ComponentPropsWithRef<"input"> & { suffix?: string },
) {
  const { suffix, className = "", ...rest } = props;
  const input = (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      className={`tabular ${inputClass} ${className}`}
    />
  );
  if (!suffix) return input;
  return (
    <div className="flex items-center gap-2">
      {input}
      <span className="shrink-0 text-sm text-muted">{suffix}</span>
    </div>
  );
}

export function Select(props: React.ComponentPropsWithRef<"select">) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`${inputClass} cursor-pointer appearance-none pr-9 ${className}`}
    />
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: React.ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-[linear-gradient(180deg,var(--accent-fill-from),var(--accent-fill-to))] text-on-accent shadow-[var(--shadow-sm)] hover:brightness-[1.08]",
    secondary:
      "border border-border bg-surface hover:border-border-strong hover:bg-sunken",
    ghost: "text-accent-text hover:bg-sunken",
    danger:
      "border border-border bg-surface text-danger-text hover:border-danger hover:bg-danger-soft",
  }[variant];
  return (
    <button
      {...rest}
      className={`pressable rounded-2xl px-4 py-3 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40 ${styles} ${className}`}
    />
  );
}

/**
 * A row of mutually exclusive choices. The selected state is a single pill
 * that slides between options, so the change reads as one thing moving rather
 * than two things blinking.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative flex rounded-2xl bg-sunken p-1"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-xl bg-surface shadow-[var(--shadow-sm)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(calc(${index} * 100%))`,
          transition: "transform var(--dur-base) var(--ease-spring)",
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`relative z-10 flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 ${
            value === option.value ? "text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`pressable relative mt-0.5 h-7 w-12 shrink-0 rounded-full ${
          checked
            ? "bg-[linear-gradient(180deg,var(--accent-fill-from),var(--accent-fill-to))]"
            : "border border-border bg-sunken"
        }`}
      >
        <span
          className="absolute top-1 size-5 rounded-full bg-white shadow-[var(--shadow-sm)]"
          style={{
            left: checked ? "calc(100% - 1.5rem)" : "0.25rem",
            transition: "left var(--dur-base) var(--ease-spring)",
          }}
        />
      </button>
    </div>
  );
}

/** Shown wherever a list is empty, so no screen is ever just blank. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-fade-in px-5 py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {hint && (
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted">{hint}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-panel flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-elevated shadow-[var(--shadow-lg)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* A grab handle reads as "this sheet moves", on the screen where it does. */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong sm:hidden"
        />
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="tight font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="pressable rounded-xl px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-fg"
          >
            Cancel
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="border-t border-border p-3">{footer}</footer>
        )}
      </div>
    </div>
  );
}
