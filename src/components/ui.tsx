"use client";

import type { ReactNode } from "react";

/**
 * The handful of shapes every screen repeats. Keeping them here means a
 * padding or radius change happens once rather than in nine files.
 */

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-surface ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          {title && <h2 className="font-semibold">{title}</h2>}
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
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-sunken px-3.5 py-2.5 text-base outline-none placeholder:text-muted focus:border-accent";

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
      className={`${inputClass} appearance-none pr-8 ${className}`}
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
    primary: "bg-accent text-white hover:opacity-90",
    secondary: "border border-border hover:bg-sunken",
    ghost: "text-accent hover:bg-sunken",
    danger: "border border-border text-danger hover:bg-sunken",
  }[variant];
  return (
    <button
      {...rest}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40 ${styles} ${className}`}
    />
  );
}

/** A row of mutually exclusive choices, used for units, splits and sexes. */
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
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-xl bg-sunken p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value
              ? "bg-surface text-fg shadow-sm"
              : "text-muted hover:text-fg"
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
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-sunken border border-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
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
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-sunken"
          >
            Cancel
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="border-t border-border p-3">{footer}</footer>}
      </div>
    </div>
  );
}
